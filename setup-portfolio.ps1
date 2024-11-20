# Create main directories
New-Item -ItemType Directory -Path srccomponentsui -Force
New-Item -ItemType Directory -Path srccontexts -Force
New-Item -ItemType Directory -Path srclib -Force

# Create UI components
$uiComponents = @{
    button.jsx = @
import  as React from react
import { Slot } from @radix-uireact-slot
import { cn } from @libutils

const Button = React.forwardRef(({ 
  className, 
  variant = default, 
  size = default, 
  asChild = false, 
  ...props 
}, ref) = {
  const Comp = asChild  Slot  button
  return (
    Comp
      className={cn(
        inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visibleoutline-none focus-visiblering-2 focus-visiblering-ring focus-visiblering-offset-2 disabledpointer-events-none disabledopacity-50,
        {
          bg-primary text-primary-foreground hoverbg-primary90 variant === default,
          bg-destructive text-destructive-foreground hoverbg-destructive90 variant === destructive,
          border border-input hoverbg-accent hovertext-accent-foreground variant === outline,
          bg-secondary text-secondary-foreground hoverbg-secondary80 variant === secondary,
          hoverbg-accent hovertext-accent-foreground variant === ghost,
          h-10 px-4 py-2 size === default,
          h-9 rounded-md px-3 size === sm,
          h-11 rounded-md px-8 size === lg,
          h-9 w-9 size === icon,
        },
        className
      )}
      ref={ref}
      {...props}
    
  )
})
Button.displayName = Button

export { Button }
@

    card.jsx = @
import  as React from react
import { cn } from @libutils

const Card = React.forwardRef(({ className, ...props }, ref) = (
  div
    ref={ref}
    className={cn(
      rounded-lg border bg-card text-card-foreground shadow-sm,
      className
    )}
    {...props}
  
))
Card.displayName = Card

const CardHeader = React.forwardRef(({ className, ...props }, ref) = (
  div
    ref={ref}
    className={cn(flex flex-col space-y-1.5 p-6, className)}
    {...props}
  
))
CardHeader.displayName = CardHeader

const CardTitle = React.forwardRef(({ className, ...props }, ref) = (
  h3
    ref={ref}
    className={cn(
      text-2xl font-semibold leading-none tracking-tight,
      className
    )}
    {...props}
  
))
CardTitle.displayName = CardTitle

const CardDescription = React.forwardRef(({ className, ...props }, ref) = (
  p
    ref={ref}
    className={cn(text-sm text-muted-foreground, className)}
    {...props}
  
))
CardDescription.displayName = CardDescription

const CardContent = React.forwardRef(({ className, ...props }, ref) = (
  div ref={ref} className={cn(p-6 pt-0, className)} {...props} 
))
CardContent.displayName = CardContent

const CardFooter = React.forwardRef(({ className, ...props }, ref) = (
  div
    ref={ref}
    className={cn(flex items-center p-6 pt-0, className)}
    {...props}
  
))
CardFooter.displayName = CardFooter

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
@

    input.jsx = @
import  as React from react
import { cn } from @libutils

const Input = React.forwardRef(({ className, type, ...props }, ref) = {
  return (
    input
      type={type}
      className={cn(
        flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background fileborder-0 filebg-transparent filetext-sm filefont-medium placeholdertext-muted-foreground focus-visibleoutline-none focus-visiblering-2 focus-visiblering-ring focus-visiblering-offset-2 disabledcursor-not-allowed disabledopacity-50,
        className
      )}
      ref={ref}
      {...props}
    
  )
})
Input.displayName = Input

export { Input }
@

    tabs.jsx = @
import  as React from react
import  as TabsPrimitive from @radix-uireact-tabs
import { cn } from @libutils

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(({ className, ...props }, ref) = (
  TabsPrimitive.List
    ref={ref}
    className={cn(
      inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground,
      className
    )}
    {...props}
  
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) = (
  TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visibleoutline-none focus-visiblering-2 focus-visiblering-ring focus-visiblering-offset-2 disabledpointer-events-none disabledopacity-50 data-[state=active]bg-background data-[state=active]text-foreground data-[state=active]shadow-sm,
      className
    )}
    {...props}
  
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(({ className, ...props }, ref) = (
  TabsPrimitive.Content
    ref={ref}
    className={cn(
      mt-2 ring-offset-background focus-visibleoutline-none focus-visiblering-2 focus-visiblering-ring focus-visiblering-offset-2,
      className
    )}
    {...props}
  
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
@
}

# Create utils.js
$utilsContent = @
import { clsx } from clsx
import { twMerge } from tailwind-merge
 
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
@

# Create the UI component files
foreach ($file in $uiComponents.Keys) {
    $content = $uiComponents[$file]
    $path = srccomponentsui$file
    New-Item -ItemType File -Path $path -Force
    Set-Content -Path $path -Value $content
}

# Create utils.js
New-Item -ItemType File -Path srclibutils.js -Force
Set-Content -Path srclibutils.js -Value $utilsContent

# Create empty component files
$components = @(
    AssetDashboard.jsx,
    PPASummaryTable.jsx,
    EarningsRiskAnalysis.jsx,
    PortfolioInputs.jsx,
    PortfolioSettings.jsx
)

foreach ($component in $components) {
    New-Item -ItemType File -Path srccomponents$component -Force
}

# Create PortfolioContext.jsx
New-Item -ItemType File -Path srccontextsPortfolioContext.jsx -Force

# Create globals.css
$globalsCSS = @
@tailwind base;
@tailwind components;
@tailwind utilities;
 
@layer base {
  root {
    --background 0 0% 100%;
    --foreground 222.2 84% 4.9%;
    --card 0 0% 100%;
    --card-foreground 222.2 84% 4.9%;
    --popover 0 0% 100%;
    --popover-foreground 222.2 84% 4.9%;
    --primary 222.2 47.4% 11.2%;
    --primary-foreground 210 40% 98%;
    --secondary 210 40% 96.1%;
    --secondary-foreground 222.2 47.4% 11.2%;
    --muted 210 40% 96.1%;
    --muted-foreground 215.4 16.3% 46.9%;
    --accent 210 40% 96.1%;
    --accent-foreground 222.2 47.4% 11.2%;
    --destructive 0 84.2% 60.2%;
    --destructive-foreground 210 40% 98%;
    --border 214.3 31.8% 91.4%;
    --input 214.3 31.8% 91.4%;
    --ring 222.2 84% 4.9%;
    --radius 0.5rem;
  }
}
 
@layer base {
   {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
@

New-Item -ItemType File -Path srcglobals.css -Force
Set-Content -Path srcglobals.css -Value $globalsCSS

Write-Host All files and directories have been created successfully!