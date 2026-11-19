package com.fovyn.health

import android.os.Bundle
import android.util.Log
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
import androidx.health.connect.client.permission.HealthPermission
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
    val permissionLauncher=rememberLauncherForActivityResult(PermissionController.createRequestPermissionResultContract()){result->
        granted=result
        Log.i("FovynHealth","Health Connect permission result received (${result.size}/${HealthReader.requiredPermissions.size})")
        message=if(result.containsAll(HealthReader.requiredPermissions))"All Health Connect permissions granted." else "Permission screen closed with ${result.size} of ${HealthReader.requiredPermissions.size} permissions granted."
    }
    fun refreshPermissions(){
        if(reader==null){granted=emptySet();return}
        scope.launch{
            try{
                granted=reader.granted()
                Log.i("FovynHealth","Health Connect permission status refreshed (${granted.size}/${reader.permissions.size})")
            }catch(e:Exception){
                Log.e("FovynHealth","Unable to read Health Connect permission status",e)
                error="Could not read Health Connect permissions: ${e.message ?: e.javaClass.simpleName}"
            }
        }
    }
    fun requestPermissions(){
        error=""
        message=""
        when(sdk){
            HealthConnectClient.SDK_AVAILABLE->try{
                Log.i("FovynHealth","Launching Health Connect permission screen for ${HealthReader.requiredPermissions.size} data types")
                permissionLauncher.launch(HealthReader.requiredPermissions)
            }catch(e:Exception){
                Log.e("FovynHealth","Health Connect permission launch failed",e)
                error="Could not open Health Connect permissions: ${e.message ?: e.javaClass.simpleName}. Use Open Health Connect below and check that it is updated."
            }
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED->error="Health Connect must be installed or updated before permissions can be granted."
            else->error="Health Connect is not supported or not available on this phone."
        }
    }
    fun openHealthConnect(){
        error=""
        try{
            context.startActivity(HealthConnectClient.getHealthConnectManageDataIntent(context))
            Log.i("FovynHealth","Opened Health Connect data management")
        }catch(e:Exception){
            Log.e("FovynHealth","Unable to open Health Connect",e)
            error="Could not open Health Connect settings: ${e.message ?: e.javaClass.simpleName}"
        }
    }
    fun sync(){if(reader==null||busy)return;scope.launch{busy=true;error="";message="Reading the last 14 days from Health Connect…";try{val snapshot=reader.snapshot(store.deviceId);message="Uploading securely to Fovyn…";lastSync=api.sync(snapshot);message="Sync complete. Open Fovyn Weekly to view the results."}catch(e:Exception){error=e.message?:"Sync failed. Retry is safe."}finally{busy=false;refreshPermissions()}}}
    LaunchedEffect(reader){refreshPermissions()}
    LaunchedEffect(deepLinkAction,reader){if(deepLinkAction=="permissions")requestPermissions();if(deepLinkAction=="sync"&&signedIn&&reader!=null)sync()}
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){
        Text("Fovyn Health",style=MaterialTheme.typography.headlineMedium);Text("Private foreground sync from Samsung Health through Health Connect.")
        if(sdk!=HealthConnectClient.SDK_AVAILABLE)Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp)){Text("Health Connect unavailable",style=MaterialTheme.typography.titleMedium);Text(if(sdk==HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED)"Update or install Health Connect, then reopen this app." else "This phone does not currently support Health Connect.")}}
        Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){Text("1. Fovyn account",style=MaterialTheme.typography.titleMedium)
            if(!signedIn){OutlinedTextField(email,{email=it},Modifier.fillMaxWidth(),label={Text("Email")},singleLine=true);OutlinedTextField(password,{password=it},Modifier.fillMaxWidth(),label={Text("Password")},singleLine=true,visualTransformation=PasswordVisualTransformation());Button({scope.launch{busy=true;error="";try{api.signIn(email,password);password="";signedIn=true;message="Signed in securely."}catch(e:Exception){error=e.message?:"Sign-in failed"}finally{busy=false}}},enabled=!busy&&email.isNotBlank()&&password.isNotBlank()){Text("Sign in")}}
            else Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text("Signed in");OutlinedButton({store.clear();signedIn=false;lastSync=null;message="Signed out."}){Text("Sign out")}}
        }}
        Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){Text("2. Health Connect permissions",style=MaterialTheme.typography.titleMedium);Text(if(reader!=null&&granted.containsAll(reader.permissions))"All required read permissions granted." else "${granted.size} of ${HealthReader.requiredPermissions.size} permissions granted.")
            PermissionLine("Steps",HealthPermission.getReadPermission(androidx.health.connect.client.records.StepsRecord::class) in granted)
            PermissionLine("Active calories",HealthPermission.getReadPermission(androidx.health.connect.client.records.ActiveCaloriesBurnedRecord::class) in granted)
            PermissionLine("Exercise",HealthPermission.getReadPermission(androidx.health.connect.client.records.ExerciseSessionRecord::class) in granted)
            PermissionLine("Sleep",HealthPermission.getReadPermission(androidx.health.connect.client.records.SleepSessionRecord::class) in granted)
            PermissionLine("Heart rate",HealthPermission.getReadPermission(androidx.health.connect.client.records.HeartRateRecord::class) in granted)
            PermissionLine("Distance",HealthPermission.getReadPermission(androidx.health.connect.client.records.DistanceRecord::class) in granted)
            Button({requestPermissions()},enabled=!busy,modifier=Modifier.fillMaxWidth()){Text("Grant / review permissions")}
            OutlinedButton({openHealthConnect()},enabled=!busy,modifier=Modifier.fillMaxWidth()){Text("Open Health Connect")}
        }}
        Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){Text("3. Synchronise",style=MaterialTheme.typography.titleMedium);Text(lastSync?.let{"Last successful sync: $it"}?:"No successful sync yet.");Button({sync()},enabled=reader!=null&&signedIn&&granted.containsAll(reader.permissions)&&!busy,modifier=Modifier.fillMaxWidth()){Text(if(busy)"Working…" else "Sync now")};Text("This test release reads a rolling 14-day window. Repeating it is safe and updates changed records without duplicating them.",style=MaterialTheme.typography.bodySmall)}}
        if(message.isNotBlank())Text(message,color=MaterialTheme.colorScheme.primary)
        if(error.isNotBlank())Text(error,color=MaterialTheme.colorScheme.error)
        Spacer(Modifier.height(10.dp));Text("Use this on one primary Samsung phone. Keep Samsung Health connected to Health Connect and open Samsung Health after changing its permissions.",style=MaterialTheme.typography.bodySmall)
    }
}

@Composable private fun PermissionLine(label:String,granted:Boolean){
    Text("${if(granted)"✓" else "○"}  $label — ${if(granted)"Granted" else "Not granted"}",style=MaterialTheme.typography.bodyMedium)
}
