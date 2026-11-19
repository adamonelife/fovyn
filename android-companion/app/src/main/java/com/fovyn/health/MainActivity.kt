package com.fovyn.health

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import kotlinx.coroutines.launch

class MainActivity:ComponentActivity(){
    override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);setContent{MaterialTheme{Surface(Modifier.fillMaxSize()){App(intent?.data?.host)}}}}
}

@Composable private fun App(deepLinkAction:String?){
    val context=androidx.compose.ui.platform.LocalContext.current
    val store=remember{TokenStore(context)}
    val api=remember{FovynApi(store)}
    val sdk=remember{HealthConnectClient.getSdkStatus(context)}
    val reader=remember(sdk){if(sdk==HealthConnectClient.SDK_AVAILABLE)HealthReader(context)else null}
    var email by remember{mutableStateOf("")};var password by remember{mutableStateOf("")};var signedIn by remember{mutableStateOf(store.load()!=null)}
    var granted by remember{mutableStateOf<Set<String>>(emptySet())};var busy by remember{mutableStateOf(false)};var message by remember{mutableStateOf("")};var error by remember{mutableStateOf("")};var lastSync by remember{mutableStateOf(store.lastSync())}
    val scope=rememberCoroutineScope()
    val permissionLauncher=rememberLauncherForActivityResult(PermissionController.createRequestPermissionResultContract()){result->granted=result;message=if(reader!=null&&result.containsAll(reader.permissions))"Health Connect permissions granted." else "Some permissions are still missing."}
    fun refreshPermissions(){if(reader==null)return;scope.launch{granted=runCatching{reader.granted()}.getOrDefault(emptySet())}}
    fun sync(){if(reader==null||busy)return;scope.launch{busy=true;error="";message="Reading the last 14 days from Health Connect…";try{val snapshot=reader.snapshot(store.deviceId);message="Uploading securely to Fovyn…";lastSync=api.sync(snapshot);message="Sync complete. Open Fovyn Weekly to view the results."}catch(e:Exception){error=e.message?:"Sync failed. Retry is safe."}finally{busy=false;refreshPermissions()}}}
    LaunchedEffect(reader){refreshPermissions()}
    LaunchedEffect(deepLinkAction,reader){if(deepLinkAction=="permissions"&&reader!=null)permissionLauncher.launch(reader.permissions);if(deepLinkAction=="sync"&&signedIn&&reader!=null)sync()}
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){
        Text("Fovyn Health",style=MaterialTheme.typography.headlineMedium);Text("Private foreground sync from Samsung Health through Health Connect.")
        if(sdk!=HealthConnectClient.SDK_AVAILABLE)Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp)){Text("Health Connect unavailable",style=MaterialTheme.typography.titleMedium);Text(if(sdk==HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED)"Update or install Health Connect, then reopen this app." else "This phone does not currently support Health Connect.")}}
        Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){Text("1. Fovyn account",style=MaterialTheme.typography.titleMedium)
            if(!signedIn){OutlinedTextField(email,{email=it},Modifier.fillMaxWidth(),label={Text("Email")},singleLine=true);OutlinedTextField(password,{password=it},Modifier.fillMaxWidth(),label={Text("Password")},singleLine=true,visualTransformation=PasswordVisualTransformation());Button({scope.launch{busy=true;error="";try{api.signIn(email,password);password="";signedIn=true;message="Signed in securely."}catch(e:Exception){error=e.message?:"Sign-in failed"}finally{busy=false}}},enabled=!busy&&email.isNotBlank()&&password.isNotBlank()){Text("Sign in")}}
            else Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text("Signed in");OutlinedButton({store.clear();signedIn=false;lastSync=null;message="Signed out."}){Text("Sign out")}}
        }}
        Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){Text("2. Health Connect permissions",style=MaterialTheme.typography.titleMedium);Text(if(reader!=null&&granted.containsAll(reader.permissions))"All required read permissions granted." else "Steps, active calories, exercise, sleep, heart rate and distance are required.");Button({reader?.let{permissionLauncher.launch(it.permissions)}},enabled=reader!=null&&!busy){Text("Grant / review permissions")}}}
        Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){Text("3. Synchronise",style=MaterialTheme.typography.titleMedium);Text(lastSync?.let{"Last successful sync: $it"}?:"No successful sync yet.");Button({sync()},enabled=reader!=null&&signedIn&&granted.containsAll(reader.permissions)&&!busy,modifier=Modifier.fillMaxWidth()){Text(if(busy)"Working…" else "Sync now")};Text("This test release reads a rolling 14-day window. Repeating it is safe and updates changed records without duplicating them.",style=MaterialTheme.typography.bodySmall)}}
        if(message.isNotBlank())Text(message,color=MaterialTheme.colorScheme.primary)
        if(error.isNotBlank())Text(error,color=MaterialTheme.colorScheme.error)
        Spacer(Modifier.height(10.dp));Text("Use this on one primary Samsung phone. Keep Samsung Health connected to Health Connect and open Samsung Health after changing its permissions.",style=MaterialTheme.typography.bodySmall)
    }
}
