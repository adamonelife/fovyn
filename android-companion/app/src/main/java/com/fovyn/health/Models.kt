package com.fovyn.health

import org.json.JSONArray
import org.json.JSONObject

data class AuthTokens(val accessToken:String,val refreshToken:String,val expiresAt:Long)
data class DaySummary(val date:String,val actualSteps:Long,val activeCalories:Double)
data class ExerciseSummary(val sourceId:String,val origin:String,val type:Int,val label:String,val title:String?,val startedAt:String,val endedAt:String,val durationMinutes:Double,val distanceKm:Double?,val activeCalories:Double?,val workoutCalories:Double?,val averageHeartRate:Double?,val cycling:Boolean,val modifiedAt:String?)
data class SleepSummary(val sourceId:String,val origin:String,val startedAt:String,val endedAt:String,val durationMinutes:Double,val stages:Map<String,Double>,val modifiedAt:String?)
data class HeartSummary(val date:String,val minimum:Double?,val maximum:Double?,val average:Double?,val count:Long)
data class SyncOutcome(val syncedAt:String,val status:String,val counts:Map<String,Int>)
data class HealthSnapshot(val deviceId:String,val deviceName:String,val permissions:Set<String>,val windowStart:String,val windowEnd:String,val daily:List<DaySummary>,val exercises:List<ExerciseSummary>,val sleep:List<SleepSummary>,val heartRate:List<HeartSummary>,val syncTrigger:String){
    private fun dataJson()=JSONObject().apply{
        put("daily",JSONArray(daily.map{JSONObject().put("date",it.date).put("actual_steps",it.actualSteps).put("active_calories",it.activeCalories)}))
        put("exercises",JSONArray(exercises.map{e->JSONObject().put("source_record_id",e.sourceId).put("data_origin",e.origin).put("exercise_type",e.type).put("exercise_label",e.label).put("title",e.title).put("started_at",e.startedAt).put("ended_at",e.endedAt).put("duration_minutes",e.durationMinutes).put("distance_km",e.distanceKm).put("active_calories",e.activeCalories).put("workout_calories",e.workoutCalories).put("workout_calorie_source",if(e.workoutCalories==null)JSONObject.NULL else "health_connect_total_calories_burned").put("average_heart_rate",e.averageHeartRate).put("is_cycling",e.cycling).put("source_last_modified_at",e.modifiedAt)}))
        put("sleep",JSONArray(sleep.map{s->JSONObject().put("source_record_id",s.sourceId).put("data_origin",s.origin).put("started_at",s.startedAt).put("ended_at",s.endedAt).put("duration_minutes",s.durationMinutes).put("stages",JSONObject(s.stages)).put("source_last_modified_at",s.modifiedAt)}))
        put("heart_rate",JSONArray(heartRate.map{h->JSONObject().put("date",h.date).put("minimum_bpm",h.minimum).put("maximum_bpm",h.maximum).put("average_bpm",h.average).put("sample_count",h.count)}))
    }
    fun fingerprint():String{
        val bytes=java.security.MessageDigest.getInstance("SHA-256").digest(dataJson().toString().toByteArray())
        return bytes.joinToString(""){"%02x".format(it)}
    }
    fun toJson()=JSONObject().apply{
        put("device_id",deviceId);put("device_name",deviceName);put("is_primary",true);put("app_version",BuildConfig.VERSION_NAME)
        put("permissions",JSONArray(permissions.toList()));put("window_start",windowStart);put("window_end",windowEnd)
        put("sync_trigger",syncTrigger);put("snapshot_fingerprint",fingerprint())
        val data=dataJson();put("daily",data.getJSONArray("daily"));put("exercises",data.getJSONArray("exercises"));put("sleep",data.getJSONArray("sleep"));put("heart_rate",data.getJSONArray("heart_rate"))
    }
}

