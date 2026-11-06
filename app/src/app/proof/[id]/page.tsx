import { Suspense } from "react";
import ProofClient from "./ProofClient";

export default function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6">Loading receipt…</p>}>
      <ProofClient params={params} />
    </Suspense>
  );
}
