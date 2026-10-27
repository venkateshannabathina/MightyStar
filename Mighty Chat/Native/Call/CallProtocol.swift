import Foundation

enum CallProtocolValidator {
    static let maxControlBytes = 64 * 1024
    private static let states: Set<String> = ["buffering", "playing", "ended", "cancelled", "error"]

    private static func boundedString(_ value: Any?, max: Int = 100) -> Bool {
        guard let text = value as? String else { return false }
        return !text.isEmpty && text.utf16.count <= max
    }
    private static func integer(_ value: Any?) -> Bool {
        guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() else { return false }
        let numberValue = number.doubleValue
        return numberValue.isFinite && numberValue >= 0 && numberValue <= 9_007_199_254_740_991 && numberValue.rounded(.towardZero) == numberValue
    }
    static func identity(_ value: Any?) -> Bool {
        guard let value = value as? [String: Any] else { return false }
        return boundedString(value["sessionId"]) && boundedString(value["characterId"]) && integer(value["generation"]) && boundedString(value["turnId"])
    }
    static func envelope(_ value: Any?) -> Bool {
        guard let value = value as? [String: Any], JSONSerialization.isValidJSONObject(value),
              let data = try? JSONSerialization.data(withJSONObject: value), data.count <= maxControlBytes else { return false }
        return integer(value["version"]) && (value["version"] as? Int) == 2 && boundedString(value["type"], max: 80) && boundedString(value["eventId"]) && integer(value["sequence"]) && identity(value["identity"])
    }
    static func playbackSnapshot(_ value: Any?) -> Bool {
        guard envelope(value), let value = value as? [String: Any], value["type"] as? String == "playback.snapshot",
              integer(value["clockEpoch"]), integer(value["chunkIndex"]), integer(value["playedSamplesInChunk"]),
              let rate = value["sampleRate"] as? NSNumber, CFGetTypeID(rate) != CFBooleanGetTypeID(),
              rate.doubleValue.isFinite, (8000...192000).contains(rate.doubleValue),
              let state = value["state"] as? String, states.contains(state) else { return false }
        return value["chunkId"] is NSNull || boundedString(value["chunkId"])
    }
}
