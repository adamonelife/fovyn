package com.fovyn.health
import org.junit.Assert.assertEquals
import org.junit.Test
class CyclingFormulaTest{
 @Test fun conservativeBandsRemainSeparate(){assertEquals(4200,cyclingEquivalent(60.0,null));assertEquals(5100,cyclingEquivalent(60.0,360.0));assertEquals(6000,cyclingEquivalent(60.0,600.0))}
 @Test fun durationIsCapped(){assertEquals(18000,cyclingEquivalent(600.0,6000.0))}
 private fun cyclingEquivalent(minutes:Double,calories:Double?):Int{if(minutes<=0)return 0;val rate=if(calories==null)70 else if(calories/minutes>=8)100 else if(calories/minutes>=5)85 else 70;return kotlin.math.round(kotlin.math.min(minutes,180.0)*rate).toInt()}
}
