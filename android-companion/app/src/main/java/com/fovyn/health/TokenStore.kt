package com.fovyn.health

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class TokenStore(context:Context){
    private val prefs=context.getSharedPreferences("fovyn_health",Context.MODE_PRIVATE)
    private val alias="fovyn_health_auth"
    val deviceId:String get()=prefs.getString("device_id",null)?:UUID.randomUUID().toString().also{prefs.edit().putString("device_id",it).apply()}
    fun save(tokens:AuthTokens){val raw=JSONObject().put("access",tokens.accessToken).put("refresh",tokens.refreshToken).put("expires",tokens.expiresAt).toString().toByteArray();val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());val packed=cipher.iv+cipher.doFinal(raw);prefs.edit().putString("tokens",Base64.encodeToString(packed,Base64.NO_WRAP)).apply()}
    fun load():AuthTokens?=runCatching{val packed=Base64.decode(prefs.getString("tokens",null),Base64.NO_WRAP);val iv=packed.copyOfRange(0,12);val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,iv));val j=JSONObject(String(cipher.doFinal(packed.copyOfRange(12,packed.size))));AuthTokens(j.getString("access"),j.getString("refresh"),j.getLong("expires"))}.getOrNull()
    fun clear(){prefs.edit().remove("tokens").remove("last_sync").apply()}
    fun setLastSync(value:String)=prefs.edit().putString("last_sync",value).apply()
    fun lastSync():String?=prefs.getString("last_sync",null)
    private fun key():SecretKey{val ks=KeyStore.getInstance("AndroidKeyStore").apply{load(null)};return (ks.getEntry(alias,null) as? KeyStore.SecretKeyEntry)?.secretKey?:KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply{init(KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())}.generateKey()}
}

