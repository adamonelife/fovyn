package com.fovyn.health

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

class FovynApi(private val store:TokenStore){
    private val client=OkHttpClient()
    private val jsonType="application/json".toMediaType()
    suspend fun signIn(email:String,password:String):AuthTokens=withContext(Dispatchers.IO){
        val body=JSONObject().put("email",email.trim()).put("password",password).toString().toRequestBody(jsonType)
        val request=Request.Builder().url("${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=password").header("apikey",BuildConfig.SUPABASE_PUBLISHABLE_KEY).post(body).build()
        executeTokens(request).also(store::save)
    }
    private fun refresh(refreshToken:String):AuthTokens{
        val body=JSONObject().put("refresh_token",refreshToken).toString().toRequestBody(jsonType)
        return executeTokens(Request.Builder().url("${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token").header("apikey",BuildConfig.SUPABASE_PUBLISHABLE_KEY).post(body).build()).also(store::save)
    }
    private fun executeTokens(request:Request):AuthTokens=client.newCall(request).execute().use{r->val text=r.body?.string().orEmpty();if(!r.isSuccessful)throw IOException(JSONObject(text.ifBlank{"{}"}).optString("msg","Sign-in failed"));val j=JSONObject(text);AuthTokens(j.getString("access_token"),j.getString("refresh_token"),System.currentTimeMillis()+j.optLong("expires_in",3600)*1000)}
    suspend fun sync(snapshot:HealthSnapshot):SyncOutcome=withContext(Dispatchers.IO){
        var tokens=store.load()?:throw IOException("Sign in first")
        if(tokens.expiresAt<System.currentTimeMillis()+60_000)tokens=refresh(tokens.refreshToken)
        fun request(token:String)=Request.Builder().url("${BuildConfig.SUPABASE_URL}/functions/v1/health-sync").header("apikey",BuildConfig.SUPABASE_PUBLISHABLE_KEY).header("authorization","Bearer $token").post(snapshot.toJson().toString().toRequestBody(jsonType)).build()
        var response=client.newCall(request(tokens.accessToken)).execute()
        if(response.code==401){response.close();tokens=refresh(tokens.refreshToken);response=client.newCall(request(tokens.accessToken)).execute()}
        response.use{r->
            val text=r.body?.string().orEmpty()
            if(!r.isSuccessful)throw IOException(runCatching{JSONObject(text).optString("error")}.getOrDefault("Sync failed"))
            val j=JSONObject(text)
            val countsJson=j.optJSONObject("counts")?:JSONObject()
            val counts=countsJson.keys().asSequence().associateWith{countsJson.optInt(it)}
            SyncOutcome(j.optString("synced_at",java.time.Instant.now().toString()),j.optString("sync_status","success"),counts).also{
                store.setLastSync(it.syncedAt)
                store.setLastOutcome(it.status)
                store.setLastError(null)
            }
        }
    }
}

