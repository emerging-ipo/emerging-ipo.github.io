import type { Metadata } from "next";
import Dashboard from "./Dashboard";

export const metadata: Metadata = {
  alternates: { canonical: "/market" },
};

export default function Home() {
  return <Dashboard />;
}
