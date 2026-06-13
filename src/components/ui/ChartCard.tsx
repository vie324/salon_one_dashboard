import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "./primitives";

export function ChartCard({
  title,
  subtitle,
  icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title={title} subtitle={subtitle} icon={icon} actions={actions} />
      <div className={cn("px-5 pb-5 pt-4", bodyClassName)}>{children}</div>
    </Card>
  );
}
