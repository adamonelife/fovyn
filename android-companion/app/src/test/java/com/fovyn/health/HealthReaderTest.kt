package com.fovyn.health

import org.junit.Assert.assertEquals
import org.junit.Test

class HealthReaderTest {
    @Test fun subtractsPausedMinutesFromElapsedDuration() {
        assertEquals(13.083,HealthReader.activeDurationMinutes(89.53,76.447),0.001)
    }

    @Test fun keepsElapsedDurationWhenNoPauseMetadataExists() {
        assertEquals(50.68,HealthReader.activeDurationMinutes(50.68,0.0),0.001)
    }

    @Test fun neverReturnsNegativeActiveDuration() {
        assertEquals(0.01,HealthReader.activeDurationMinutes(10.0,20.0),0.001)
    }
}
