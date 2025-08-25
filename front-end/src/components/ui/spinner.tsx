import { Loader2 } from "lucide-react";
import React from "react";

const Spinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  );
}

Spinner.displayName = "Spinner";

export { Spinner };
