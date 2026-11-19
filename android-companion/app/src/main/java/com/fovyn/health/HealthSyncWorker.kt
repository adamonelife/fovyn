package com.fovyn.health

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.io.IOException
import java.util.concurrent.TimeUnit

class HealthSyncWorker(appContext:Context,params:WorkerParameters):CoroutineWorker(appContext,params){
    override suspend fun doWork():Result{
        val store=TokenStore(applicationContext)
        if(store.load()==null)return Result.success()
        if(HealthConnectClient.getSdkStatus(applicationContext)!=HealthConnectClient.SDK_AVAILABLE){
            store.setLastError("Health Connect unavailable")
            return Result.success()
        }
        return try{
            val reader=HealthReader(applicationContext)
            if(!reader.backgroundReadAvailable){
                store.setLastError("Background Health Connect reads are unavailable. Update Health Connect.")
                return Result.success()
            }
            val granted=reader.granted()
            if(!granted.containsAll(reader.permissions)){
                store.setLastError("Background health permission needs attention")
                return Result.success()
            }
            val outcome=FovynApi(store).sync(reader.snapshot(store.deviceId,"background"))
            Log.i("FovynHealth","Background sync completed: ${outcome.status}")
            Result.success()
        }catch(e:SecurityException){
            Log.w("FovynHealth","Background permission unavailable",e)
            store.setLastError("Health Connect permission was revoked")
            Result.success()
        }catch(e:IOException){
            Log.w("FovynHealth","Background sync will retry",e)
            store.setLastError(e.message?:"Background sync failed")
            if(e.message?.contains("sign",ignoreCase=true)==true||e.message?.contains("token",ignoreCase=true)==true){
                store.setLastError("Fovyn sign-in expired. Open the companion and sign in again.")
                Result.failure()
            }else Result.retry()
        }catch(e:Exception){
            Log.e("FovynHealth","Background sync failed",e)
            store.setLastError(e.message?:"Background sync failed")
            Result.failure()
        }
    }
}

object SyncScheduler{
    const val PERIOD_MINUTES=30L
    private const val PERIODIC_NAME="fovyn_health_periodic_v1"
    private const val IMMEDIATE_NAME="fovyn_health_immediate"
    private val network=Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    fun schedule(context:Context){
        val request=PeriodicWorkRequestBuilder<HealthSyncWorker>(PERIOD_MINUTES,TimeUnit.MINUTES)
            .setConstraints(network)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL,15,TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC_NAME,ExistingPeriodicWorkPolicy.UPDATE,request)
    }

    fun enqueueNow(context:Context){
        val request=OneTimeWorkRequestBuilder<HealthSyncWorker>()
            .setConstraints(network)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL,15,TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(IMMEDIATE_NAME,ExistingWorkPolicy.KEEP,request)
    }
}
