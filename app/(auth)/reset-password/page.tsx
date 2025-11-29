import { Suspense } from "react";
import { ResetPasswordClient } from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto py-12">Loading...</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
