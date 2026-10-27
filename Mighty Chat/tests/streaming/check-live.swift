import Cocoa
import Security
@main struct StreamLiveCheck {
 @MainActor static func main() {
  do {
   let bundle=URL(fileURLWithPath:CommandLine.arguments[1]), script=CommandLine.arguments[2], output=CommandLine.arguments[3]
   let store=CredentialStore(agentURL:bundle.appendingPathComponent("Contents/Resources/credential-agent"))
   guard let key=store.read("groq",reload:true) else {throw URLError(.userAuthenticationRequired)}
   var env=ProcessInfo.processInfo.environment
   for provider in ["GROQ","OPENAI","GEMINI","ANTHROPIC"]{env.removeValue(forKey:provider+"_API_KEY")}
   env["GROQ_API_KEY"]=key
   let process=Process();process.executableURL=bundle.appendingPathComponent("Contents/Resources/node");process.arguments=[script,output];process.environment=env
   try process.run();process.waitUntilExit();exit(process.terminationStatus)
  }catch{print("Live check could not start; no credentials logged.");exit(1)}
 }
}
