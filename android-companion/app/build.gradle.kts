plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}
val releaseStoreFile=System.getenv("FOVYN_ANDROID_KEYSTORE_PATH")
val releaseStorePassword=System.getenv("FOVYN_ANDROID_KEYSTORE_PASSWORD")
val releaseKeyAlias=System.getenv("FOVYN_ANDROID_KEY_ALIAS")
val releaseKeyPassword=System.getenv("FOVYN_ANDROID_KEY_PASSWORD")
android {
    namespace="com.fovyn.health"
    compileSdk=36
    defaultConfig {
        applicationId="com.fovyn.health"
        minSdk=28
        targetSdk=35
        versionCode=providers.gradleProperty("fovynVersionCode").orNull?.toInt()?:5
        versionName=providers.gradleProperty("fovynVersionName").orNull?:"1.3.0"
        testInstrumentationRunner="androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String","SUPABASE_URL","\"https://ukvrfejyyhgnzljquxvt.supabase.co\"")
        buildConfigField("String","SUPABASE_PUBLISHABLE_KEY","\"sb_publishable_dl9JaUQp-U1dmuaGY1qu2A_oUHsatPt\"")
    }
    signingConfigs {
        if(!releaseStoreFile.isNullOrBlank()&&!releaseStorePassword.isNullOrBlank()&&!releaseKeyAlias.isNullOrBlank()&&!releaseKeyPassword.isNullOrBlank()){
            create("release"){
                storeFile=file(releaseStoreFile)
                storePassword=releaseStorePassword
                keyAlias=releaseKeyAlias
                keyPassword=releaseKeyPassword
                storeType="PKCS12"
            }
        }
    }
    buildTypes {
        getByName("release"){signingConfig=signingConfigs.findByName("release")}
    }
    buildFeatures { compose=true; buildConfig=true }
    compileOptions { sourceCompatibility=JavaVersion.VERSION_17; targetCompatibility=JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget="17" }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}
dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.01.00"))
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.health.connect:connect-client:1.1.0")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
}
