/**
 * Local-development replacement for the production Firebase analytics adapter.
 *
 * The production configuration is intentionally excluded from this checkout.
 * Viewing a model does not depend on analytics, so keep local visits private
 * and allow the scene to load without Firebase credentials.
 */
export class FirebaseInstance {
    private static readonly _instance = new FirebaseInstance();

    public static GetInstance(): FirebaseInstance {
        return FirebaseInstance._instance;
    }

    public async countUp(_collection: string, _document: string): Promise<void> {
        // Intentionally disabled for local development.
    }
}
