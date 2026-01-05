"use client";

export default function AdminNotConfiguredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1915] px-4">
      <div className="w-full max-w-2xl rounded-2xl border-2 border-[#c53030] bg-[#fdfcf9] p-8 shadow-lg">
        {/* Error Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c53030]">
            <span className="text-xl font-[var(--font-terminal)] text-white">!</span>
          </div>
          <div>
            <h1 className="font-[var(--font-terminal)] text-xl text-[#1a1915]">
              CONFIGURATION_ERROR
            </h1>
            <p className="text-xs text-[#6b6560] font-[var(--font-mono)]">
              status: 500 | admin_password: not_configured
            </p>
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <div className="rounded-lg border border-[#d48806] bg-[#fffbeb] p-4">
            <p className="text-sm text-[#1a1915] font-[var(--font-mono)]">
              <span className="font-bold text-[#d48806]">ERROR:</span> Admin
              password is not configured.
            </p>
            <p className="mt-2 text-xs text-[#6b6560] font-[var(--font-mono)]">
              Write operations (create, update, delete) require an admin password
              to be set for security purposes.
            </p>
          </div>

          {/* Solution */}
          <div className="rounded-lg border border-[#d4cfc5] bg-[#f5f4f0] p-4">
            <h2 className="font-[var(--font-terminal)] text-sm text-[#1a1915] mb-3">
              &gt; SOLUTION
            </h2>
            <div className="space-y-3 text-xs font-[var(--font-mono)]">
              <div>
                <p className="text-[#6b6560] mb-1"># 1. Open your .env file:</p>
                <code className="block rounded bg-[#1a1915] px-3 py-2 text-[#00a86b]">
                  D:\dev\EnjoyRecord\enjoyrecord\.env
                </code>
              </div>
              <div>
                <p className="text-[#6b6560] mb-1"># 2. Add this line:</p>
                <code className="block rounded bg-[#1a1915] px-3 py-2 text-[#00a86b]">
                  ENJOYRECORD_ADMIN_PASSWORD=your_secure_password_here
                </code>
              </div>
              <div>
                <p className="text-[#6b6560] mb-1">
                  # 3. Replace with your desired password
                </p>
              </div>
              <div>
                <p className="text-[#6b6560] mb-1"># 4. Restart the server:</p>
                <code className="block rounded bg-[#1a1915] px-3 py-2 text-[#00a86b]">
                  npm run dev
                </code>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="rounded-lg border border-[#00a86b] bg-[#f0fdf9] p-4">
            <h2 className="font-[var(--font-terminal)] text-sm text-[#1a1915] mb-2">
              &gt; SECURITY_NOTE
            </h2>
            <p className="text-xs text-[#6b6560] font-[var(--font-mono)]">
              The admin password protects write operations from unauthorized
              access. Make sure to use a strong password and never commit the
              .env file to version control.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#d4cfc5] flex justify-between text-xs text-[#9a958f] font-[var(--font-mono)]">
          <span>code: ENJOYRECORD_ADMIN_PASSWORD_MISSING</span>
          <span>docs: /README.md</span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => window.location.reload()}
          className="mt-4 w-full term-btn glitch-hover"
        >
          <span>{"[>] RESTART_AFTER_CONFIG"}</span>
        </button>
      </div>
    </div>
  );
}
