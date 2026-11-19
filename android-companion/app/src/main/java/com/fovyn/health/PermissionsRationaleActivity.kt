package com.fovyn.health

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

class PermissionsRationaleActivity:ComponentActivity(){
    override fun onCreate(savedInstanceState:Bundle?){
        super.onCreate(savedInstanceState)
        setContent{
            MaterialTheme{
                Surface(Modifier.fillMaxSize()){
                    Column(Modifier.padding(24.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
                        Text("How Fovyn uses Health Connect",style=MaterialTheme.typography.headlineSmall)
                        Text("Fovyn reads only the activity, exercise, sleep and heart-rate information you choose to share. It sends summaries to your private Fovyn account so Weekly can update automatically.")
                        Text("Fovyn does not sell health data, does not use it for advertising and never changes your measured step count.")
                    }
                }
            }
        }
    }
}
