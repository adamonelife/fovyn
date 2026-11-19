package com.fovyn.health

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HealthPermissionsTest {
    @Test fun requestsAllSevenReadPermissions(){
        val permissions=HealthReader.requiredPermissions
        assertEquals(7,permissions.size)
        listOf("READ_STEPS","READ_ACTIVE_CALORIES_BURNED","READ_TOTAL_CALORIES_BURNED","READ_EXERCISE","READ_SLEEP","READ_HEART_RATE","READ_DISTANCE")
            .forEach{suffix->assertTrue("Missing $suffix",permissions.any{it.endsWith(suffix)})}
        assertTrue(permissions.none{it.contains("WRITE_")})
    }
    @Test fun backgroundIntervalRespectsWorkManagerMinimum(){
        assertTrue(SyncScheduler.PERIOD_MINUTES>=15)
        assertEquals(30L,SyncScheduler.PERIOD_MINUTES)
    }
}
