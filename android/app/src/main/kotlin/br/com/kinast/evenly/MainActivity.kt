package br.com.kinast.evenly

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * MainActivity handles Google Assistant App Actions for voice commands.
 * 
 * When a user says a voice command like:
 * - "Adicione 180 reais de gasolina na minha viagem de Porto de Galinhas"
 * - "Add 50 dollars for lunch to my Beach Trip"
 * 
 * The command is received via an Intent with action CREATE_EXPENSE,
 * parsed, and forwarded to the Flutter layer via MethodChannel.
 */
class MainActivity : FlutterActivity() {
    
    companion object {
        private const val CHANNEL = "br.com.kinast.evenly/voice_commands"
        private const val CREATE_EXPENSE_ACTION = "br.com.kinast.evenly.CREATE_EXPENSE"
    }
    
    private var methodChannel: MethodChannel? = null
    private var pendingVoiceCommand: Map<String, Any?>? = null
    
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        // Set up the MethodChannel for communication with Flutter
        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
        
        // Handle any pending voice command from the initial intent
        pendingVoiceCommand?.let { command ->
            sendVoiceCommandToFlutter(command)
            pendingVoiceCommand = null
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Handle the initial launch intent
        handleIntent(intent)
    }
    
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Handle intents when app is already running (singleTop mode)
        setIntent(intent)
        handleIntent(intent)
    }
    
    /**
     * Processes incoming intents from Google Assistant or deep links.
     */
    private fun handleIntent(intent: Intent?) {
        if (intent == null) return
        
        when {
            // Handle CREATE_EXPENSE action from App Actions
            intent.action == CREATE_EXPENSE_ACTION -> {
                handleCreateExpenseIntent(intent)
            }
            // Handle deep links (evenly://expense?...)
            intent.action == Intent.ACTION_VIEW && intent.data?.scheme == "evenly" -> {
                handleDeepLink(intent.data)
            }
        }
    }
    
    /**
     * Handles the CREATE_EXPENSE intent from Google Assistant App Actions.
     * Extracts parameters from intent extras and forwards to Flutter.
     */
    private fun handleCreateExpenseIntent(intent: Intent) {
        val extras = intent.extras
        
        // Extract parameters from intent extras
        // Google Assistant may pass these as various types, so we handle flexibly
        val amount = extractAmount(extras)
        val title = extras?.getString("title")
        val tripName = extras?.getString("tripName")
        val payerName = extras?.getString("payerName")
        val participantNames = extractParticipantNames(extras)
        
        val commandData = mapOf(
            "type" to "create_expense",
            "amount" to amount,
            "title" to title,
            "tripName" to tripName,
            "payerName" to payerName,
            "participantNames" to participantNames,
            "source" to "google_assistant"
        )
        
        // If Flutter engine is ready, send immediately; otherwise queue
        if (methodChannel != null) {
            sendVoiceCommandToFlutter(commandData)
        } else {
            pendingVoiceCommand = commandData
        }
    }
    
    /**
     * Handles deep links with the evenly:// scheme.
     * Example: evenly://expense?amount=180&title=gasolina&tripName=Porto
     */
    private fun handleDeepLink(uri: Uri?) {
        if (uri == null || uri.host != "expense") return
        
        val amount = uri.getQueryParameter("amount")?.toDoubleOrNull()
        val title = uri.getQueryParameter("title")
        val tripName = uri.getQueryParameter("tripName")
        val payerName = uri.getQueryParameter("payerName")
        val participantNames = uri.getQueryParameter("participantNames")?.split(",")
        
        val commandData = mapOf(
            "type" to "create_expense",
            "amount" to amount,
            "title" to title,
            "tripName" to tripName,
            "payerName" to payerName,
            "participantNames" to participantNames,
            "source" to "deep_link"
        )
        
        if (methodChannel != null) {
            sendVoiceCommandToFlutter(commandData)
        } else {
            pendingVoiceCommand = commandData
        }
    }
    
    /**
     * Extracts the monetary amount from intent extras.
     * Handles various formats that Google Assistant might use.
     */
    private fun extractAmount(extras: Bundle?): Double? {
        if (extras == null) return null
        
        return when {
            extras.containsKey("amount") -> {
                when (val value = extras.get("amount")) {
                    is Double -> value
                    is Float -> value.toDouble()
                    is Int -> value.toDouble()
                    is Long -> value.toDouble()
                    is String -> value.toDoubleOrNull()
                    else -> null
                }
            }
            // Some Assistant versions use nested structure
            extras.containsKey("expense.amount") -> {
                extras.getString("expense.amount")?.toDoubleOrNull()
            }
            else -> null
        }
    }
    
    /**
     * Extracts participant names from intent extras.
     * Handles both single string (comma-separated) and array formats.
     */
    private fun extractParticipantNames(extras: Bundle?): List<String>? {
        if (extras == null) return null
        
        val key = if (extras.containsKey("participantNames")) "participantNames" 
                  else if (extras.containsKey("expense.participants")) "expense.participants"
                  else return null
        
        return when (val value = extras.get(key)) {
            is String -> value.split(",").map { it.trim() }.filter { it.isNotEmpty() }
            is ArrayList<*> -> value.filterIsInstance<String>()
            is Array<*> -> value.filterIsInstance<String>()
            else -> null
        }
    }
    
    /**
     * Sends voice command data to the Flutter layer via MethodChannel.
     */
    private fun sendVoiceCommandToFlutter(commandData: Map<String, Any?>) {
        methodChannel?.invokeMethod("onVoiceCommand", commandData)
    }
}
