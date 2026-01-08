import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#00141d] text-white hover:bg-[#00141d]/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-secondary-text-light/20 dark:border-secondary-text-dark/20 bg-background hover:bg-secondary-text-light/5 dark:hover:bg-secondary-text-dark/5",
        secondary: "bg-secondary-text-light dark:bg-secondary-text-dark text-background hover:bg-secondary-text-light/90 dark:hover:bg-secondary-text-dark/90",
        ghost: "hover:bg-secondary-text-light/10 dark:hover:bg-secondary-text-dark/10",
        link: "text-primary underline-offset-4 hover:underline",
        dark: "bg-background-dark text-primary-text-dark hover:bg-background-dark/90",
      },
      size: {
        default: "h-11 px-4 py-2 min-h-[44px]", // Touch-friendly 44px
        sm: "h-9 rounded-md px-3 min-h-[36px]",
        lg: "h-12 rounded-md px-6 min-h-[44px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]", // Touch-friendly
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
