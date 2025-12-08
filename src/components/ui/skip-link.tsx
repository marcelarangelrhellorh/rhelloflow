import { cn } from "@/lib/utils";

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
  className?: string;
}

export function SkipLink({ 
  href = "#main-content", 
  children = "Pular para o conteúdo principal",
  className 
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100]",
        "focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:rounded-md",
        "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none",
        "focus:shadow-lg focus:font-medium",
        className
      )}
    >
      {children}
    </a>
  );
}
