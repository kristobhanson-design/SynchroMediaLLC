import type { Metadata } from "next";
import ResetPassword from "@/components/admin/ResetPassword";
import "../admin.css";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPassword />;
}
