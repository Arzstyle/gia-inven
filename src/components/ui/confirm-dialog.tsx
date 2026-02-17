import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2, RotateCcw, Info } from "lucide-react";

type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    onConfirm: () => void;
}

const variantConfig: Record<ConfirmVariant, { icon: React.ReactNode; actionClass: string; iconBg: string }> = {
    danger: {
        icon: <Trash2 className="h-6 w-6 text-red-600" />,
        actionClass: "bg-red-600 hover:bg-red-700 text-white",
        iconBg: "bg-red-100 dark:bg-red-950",
    },
    warning: {
        icon: <RotateCcw className="h-6 w-6 text-orange-600" />,
        actionClass: "bg-orange-600 hover:bg-orange-700 text-white",
        iconBg: "bg-orange-100 dark:bg-orange-950",
    },
    info: {
        icon: <Info className="h-6 w-6 text-blue-600" />,
        actionClass: "bg-blue-600 hover:bg-blue-700 text-white",
        iconBg: "bg-blue-100 dark:bg-blue-950",
    },
};

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Ya, Lanjutkan",
    cancelLabel = "Batal",
    variant = "danger",
    onConfirm,
}: ConfirmDialogProps) {
    const config = variantConfig[variant];

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-sm">
                <AlertDialogHeader>
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.iconBg}`}>
                            {config.icon}
                        </div>
                        <div className="text-center sm:text-left">
                            <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
                            <AlertDialogDescription className="mt-1.5 text-sm">
                                {description}
                            </AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-2 gap-2 sm:gap-0">
                    <AlertDialogCancel className="text-sm">{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction className={`text-sm ${config.actionClass}`} onClick={onConfirm}>
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
