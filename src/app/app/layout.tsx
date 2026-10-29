import { logoutAction } from "@/app/(auth)/actions";
import { EmployeeShell } from "@/components/layout/employee-shell";
import { requireActor } from "@/server/current";

export default async function EmployeeLayout({ children }: LayoutProps<"/app">) {
  await requireActor({ roles: ["EMPLOYEE"] });
  return <EmployeeShell logout={logoutAction}>{children}</EmployeeShell>;
}
