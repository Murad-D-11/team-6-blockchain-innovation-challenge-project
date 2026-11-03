import Link from "next/link";

const links: { href: string; label: string; step: string }[] = [
  { href: "/worker/request?role=worker", label: "Worker: request payoff", step: "1" },
  { href: "/creditor?role=creditor", label: "Creditor: accept settlement", step: "2" },
  { href: "/funder?role=funder", label: "Funder: fund a request", step: "3, 8" },
  { href: "/proof/1", label: "Proof page for loan 1 (public)", step: "4" },
  { href: "/worker?role=worker", label: "Worker: dashboard and send home", step: "5, 6" },
  { href: "/family?role=family", label: "Family: balance", step: "7" },
  { href: "/admin?role=admin", label: "Admin: creditors and period", step: "" },
  { href: "/dev", label: "Dev: run the golden flow on the mock", step: "" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">Laya (testnet)</h1>
      <p className="mt-1 text-sm text-gray-600">
        Demo pages. The role in the link sets the mock account; add{" "}
        <code>?mockReset=1</code> to wipe the mock state.
      </p>
      <ul className="mt-6 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-blue-600 underline">
              {l.label}
            </Link>
            {l.step && <span className="ml-2 text-xs text-gray-500">demo step {l.step}</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
