import Foundation

@main struct ContextualOpeningEval {
    static func main() {
        guard CommandLine.arguments.count == 4 else { exit(1) }
        let installed=URL(fileURLWithPath:CommandLine.arguments[1]),source=URL(fileURLWithPath:CommandLine.arguments[2]),output=CommandLine.arguments[3]
        let store=CredentialStore(agentURL:installed.appendingPathComponent("Contents/Resources/credential-agent"))
        guard let key=store.read("groq",reload:true) else { print("Saved Groq access unavailable; no key printed.");exit(1) }
        let process=Process()
        var environment=ProcessInfo.processInfo.environment
        for provider in ["groq","openai","anthropic","gemini"] { environment.removeValue(forKey:provider.uppercased()+"_API_KEY") }
        environment["GROQ_API_KEY"]=key;environment["MIGHTY_STREAM_CHAT"]="0";environment["MIGHTY_MEMORY_V1"]="0"
        process.executableURL=installed.appendingPathComponent("Contents/Resources/node")
        process.arguments=[source.appendingPathComponent("scripts/eval-contextual-openings.cjs").path,output]
        process.environment=environment;process.standardOutput=FileHandle.standardOutput;process.standardError=FileHandle.standardError
        do {try process.run();process.waitUntilExit();exit(process.terminationStatus)} catch {print("Synthetic context evaluation could not start.");exit(1)}
    }
}
