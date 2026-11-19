package com.fovyn.health

import android.content.Context
import android.os.Build
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.aggregate.AggregationResult
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class HealthReader(private val context:Context){
    private val client=HealthConnectClient.getOrCreate(context)
    private val zone=ZoneId.of("Asia/Makassar")
    val permissions=requiredPermissions
    suspend fun granted()=client.permissionController.getGrantedPermissions()
    suspend fun snapshot(deviceId:String):HealthSnapshot{
        val granted=granted();if(!granted.containsAll(permissions))throw IllegalStateException("Grant all requested Health Connect permissions first")
        val today=LocalDate.now(zone)
        val first=today.minusDays(13)
        val start=first.atStartOfDay(zone).toInstant()
        val end=today.plusDays(1).atStartOfDay(zone).toInstant()
        val days=(0L..13L).map{first.plusDays(it)}.map{day->
            val from=day.atStartOfDay(zone).toInstant()
            val to=day.plusDays(1).atStartOfDay(zone).toInstant()
            val a=client.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL,ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL),TimeRangeFilter.between(from,to)))
            DaySummary(day.toString(),a[StepsRecord.COUNT_TOTAL]?:0,a[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories?:0.0)
        }
        val exercises=readExercises(start,end)
        val sleep=readSleep(start.minus(Duration.ofDays(1)),end)
        val heart=(0L..13L).map{first.plusDays(it)}.map{day->
            val a=client.aggregate(AggregateRequest(setOf(HeartRateRecord.BPM_MIN,HeartRateRecord.BPM_MAX,HeartRateRecord.BPM_AVG,HeartRateRecord.MEASUREMENTS_COUNT),TimeRangeFilter.between(day.atStartOfDay(zone).toInstant(),day.plusDays(1).atStartOfDay(zone).toInstant())))
            HeartSummary(day.toString(),a[HeartRateRecord.BPM_MIN]?.toDouble(),a[HeartRateRecord.BPM_MAX]?.toDouble(),a[HeartRateRecord.BPM_AVG]?.toDouble(),a[HeartRateRecord.MEASUREMENTS_COUNT]?:0)
        }
        return HealthSnapshot(deviceId,"${Build.MANUFACTURER} ${Build.MODEL}",granted,start.toString(),end.toString(),days,exercises,sleep,heart)
    }
    private suspend fun readExercises(start:Instant,end:Instant):List<ExerciseSummary>{
        val all=mutableListOf<ExerciseSessionRecord>();var token:String?=null
        do{val r=client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class,TimeRangeFilter.between(start,end),pageToken=token));all+=r.records;token=r.pageToken?.takeIf{it.isNotEmpty()}}while(token!=null)
        return all.map{e->val a=client.aggregate(AggregateRequest(setOf(DistanceRecord.DISTANCE_TOTAL,ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL,HeartRateRecord.BPM_AVG),TimeRangeFilter.between(e.startTime,e.endTime)));val cycling=e.exerciseType==ExerciseSessionRecord.EXERCISE_TYPE_BIKING||e.exerciseType==ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY;ExerciseSummary(e.metadata.id,e.metadata.dataOrigin.packageName,e.exerciseType,exerciseLabel(e.exerciseType),e.title,e.startTime.toString(),e.endTime.toString(),Duration.between(e.startTime,e.endTime).toMillis()/60000.0,a[DistanceRecord.DISTANCE_TOTAL]?.inKilometers,a[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories,a[HeartRateRecord.BPM_AVG]?.toDouble(),cycling,e.metadata.lastModifiedTime.toString())}
    }
    private suspend fun readSleep(start:Instant,end:Instant):List<SleepSummary>{
        val all=mutableListOf<SleepSessionRecord>();var token:String?=null
        do{val r=client.readRecords(ReadRecordsRequest(SleepSessionRecord::class,TimeRangeFilter.between(start,end),pageToken=token));all+=r.records;token=r.pageToken?.takeIf{it.isNotEmpty()}}while(token!=null)
        return all.map{s->val stages=s.stages.groupBy{stageName(it.stage)}.mapValues{(_,v)->v.sumOf{Duration.between(it.startTime,it.endTime).toMillis()/60000.0}};SleepSummary(s.metadata.id,s.metadata.dataOrigin.packageName,s.startTime.toString(),s.endTime.toString(),Duration.between(s.startTime,s.endTime).toMillis()/60000.0,stages,s.metadata.lastModifiedTime.toString())}
    }
    private fun exerciseLabel(type:Int)=when(type){ExerciseSessionRecord.EXERCISE_TYPE_BIKING->"Cycling";ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY->"Stationary cycling";ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING->"Strength training";ExerciseSessionRecord.EXERCISE_TYPE_WALKING->"Walking";ExerciseSessionRecord.EXERCISE_TYPE_RUNNING->"Running";else->"Exercise $type"}
    private fun stageName(type:Int)=when(type){SleepSessionRecord.STAGE_TYPE_AWAKE->"awake";SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED->"awake_in_bed";SleepSessionRecord.STAGE_TYPE_LIGHT->"light";SleepSessionRecord.STAGE_TYPE_DEEP->"deep";SleepSessionRecord.STAGE_TYPE_REM->"rem";SleepSessionRecord.STAGE_TYPE_SLEEPING->"sleeping";SleepSessionRecord.STAGE_TYPE_OUT_OF_BED->"out_of_bed";else->"unknown"}
    companion object {
        val requiredPermissions=setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
            HealthPermission.getReadPermission(DistanceRecord::class)
        )
    }
}
