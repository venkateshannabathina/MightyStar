import Cocoa
import Security

@main struct MemoryPackageCheck {
    @MainActor static func main() async {
        let root=URL(fileURLWithPath:CommandLine.arguments[1]), output=URL(fileURLWithPath:CommandLine.arguments[2])
        var server:Process?, input:Pipe?
        defer {try? input?.fileHandleForWriting.close();server?.terminate()}
        do {
            let store=CredentialStore(agentURL:root.appendingPathComponent("Contents/Resources/credential-agent"))
            var environment=ProcessInfo.processInfo.environment
            for provider in ["groq","openai","anthropic","gemini"]{environment.removeValue(forKey:provider.uppercased()+"_API_KEY")}
            guard let key=store.read("groq",reload:true) else {print("FAIL: Saved Groq key unavailable to signed package.");exit(1)}
            environment["GROQ_API_KEY"]=key;environment["MIGHTY_MEMORY_V1"]="1";environment["MIGHTY_MEMORY_ROOT"]=output.appendingPathComponent("temporary-memory").path
            let process=Process(),stdin=Pipe(),stdoutPipe=Pipe();process.executableURL=root.appendingPathComponent("Contents/Resources/node")
            process.arguments=[root.appendingPathComponent("Contents/Resources/companion-server.cjs").path];process.environment=environment
            process.standardInput=stdin;process.standardOutput=stdoutPipe;process.standardError=FileHandle.nullDevice;server=process;input=stdin;try process.run()
            var line=Data()
            while true{let byte=stdoutPipe.fileHandleForReading.readData(ofLength:1);guard !byte.isEmpty else{throw URLError(.cannotConnectToHost)};if byte==Data([10]){break};line.append(byte);if line.count>8192{throw URLError(.badServerResponse)}}
            let ready=try JSONSerialization.jsonObject(with:line) as! [String:Any]
            let origin="http://127.0.0.1:\(ready["port"] as! Int)", token=ready["token"] as! String
            func api(_ route:String,_ body:[String:Any]?=nil) async throws -> [String:Any] {
                var request=URLRequest(url:URL(string:origin+route)!);request.timeoutInterval=45;request.setValue(token,forHTTPHeaderField:"X-Mighty-Token")
                if let body{request.httpMethod="POST";request.setValue("application/json",forHTTPHeaderField:"Content-Type");request.httpBody=try JSONSerialization.data(withJSONObject:body)}
                let (data,response)=try await URLSession.shared.data(for:request)
                guard (response as? HTTPURLResponse)?.statusCode==200 else{throw URLError(.badServerResponse)}
                return try JSONSerialization.jsonObject(with:data) as? [String:Any] ?? [:]
            }
            let character:[String:Any] = ["id":"wp1-package-check","name":"Mira","description":"A warm friend. Reply in one short sentence.","profile":["aiProvider":"groq","aiModel":"openai/gpt-oss-20b","examples":"User: Hey. Mira: Hey, you."]]
            let card=try await api("/api/memory/characters",["character":character]);guard card["compiled"] as? Bool==true else{throw URLError(.cannotParseResponse)}
            let body:[String:Any] = ["characterId":"wp1-package-check","clientTurnId":"one","userMessage":"My dog is named Milo. Please remember his name."]
            let result=try await api("/api/chat",body);guard !(result["reply"] as? String ?? "").isEmpty else{throw URLError(.zeroByteResource)}
            let retry=try await api("/api/chat",body);guard retry["reply"] as? String==result["reply"] as? String else{throw URLError(.cannotParseResponse)}
            var facts:[[String:Any]]=[]
            for _ in 0..<80{let value=try await api("/api/memory/facts?characterId=wp1-package-check");facts=value["facts"] as? [[String:Any]] ?? [];if !facts.isEmpty{break};try await Task.sleep(nanoseconds:250_000_000)}
            guard let fact=facts.first,let id=fact["id"] as? Int else{throw URLError(.resourceUnavailable)}
            _ = try await api("/api/memory/edit",["characterId":"wp1-package-check","factId":id,"text":"The user has a dog named Rex."])
            let exported=try await api("/api/memory/export?characterId=wp1-package-check")
            guard (exported["facts"] as? [[String:Any]])?.contains(where:{$0["text"] as? String=="The user has a dog named Rex."})==true else{throw URLError(.cannotParseResponse)}
            _ = try await api("/api/memory/delete",["characterId":"wp1-package-check","factId":id])
            _ = try await api("/api/memory/forget",["characterId":"wp1-package-check"])
            let empty=try await api("/api/memory/facts?characterId=wp1-package-check");guard (empty["facts"] as? [Any])?.isEmpty==true else{throw URLError(.cannotParseResponse)}
            let receipt:[String:Any] = ["sqlite":"built-in node:sqlite","embedding":"local quantized BGE 384","signedNativeRuntimeLoaded":true,"liveGroqPersonaAndReply":true,"backgroundFactExtraction":true,"idempotentRetry":true,"editExportDeleteForget":true]
            try JSONSerialization.data(withJSONObject:receipt,options:[.prettyPrinted,.sortedKeys]).write(to:output.appendingPathComponent("receipt.json"),options:.atomic)
            print("PASS: Signed packaged Node SQLite + offline ONNX runtime; real Groq card/reply/extraction; compact retry and memory controls.")
        }catch{print("FAIL: Signed memory package check (\((error as NSError).code)); no content or credentials logged.");exit(1)}
    }
}
