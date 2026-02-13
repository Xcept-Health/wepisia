import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Compass } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Calcul du mouvement pour l'effet parallaxe
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / 50;
      const y = (e.clientY - window.innerHeight / 2) / 50;
      setOffset({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background">
      
      {/* --- PARALLAXE : 404 GÉANT (Arrière-plan, bouge à l'opposé) --- */}
      <div 
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none transition-transform duration-200 ease-out"
        style={{ 
          transform: `translate(${offset.x * -1.5}px, ${offset.y * -1.5}px)`,
        }}
      >
        <span className="text-[35vw] font-black text-primary opacity-[0.05] tracking-tighter leading-none">
          404
        </span>
      </div>

      {/* --- ACCENTS DE COULEUR (Variables Chart) --- */}
      <div 
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-chart-1 opacity-20 blur-[100px] animate-bounce-gentle"
        style={{ transform: `translate(${offset.x * 0.5}px, ${offset.y * 0.5}px)` }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-chart-3 opacity-20 blur-[100px]"
        style={{ transform: `translate(${offset.x * -0.8}px, ${offset.y * -0.8}px)` }}
      />

      {/* --- CONTENU PRINCIPAL (Premier plan) --- */}
      <div 
        className="relative z-10 w-full max-w-lg mx-4 transition-transform duration-300 ease-out"
        style={{ 
          transform: `translate(${offset.x}px, ${offset.y}px)`,
        }}
      >
        <div className="glass border border-border p-8 md:p-12 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-scale-in overflow-hidden">
          
          {/* Lueur interne qui suit la souris */}
          <div 
            className="absolute pointer-events-none inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at ${50 + offset.x}% ${50 + offset.y}%, var(--primary), transparent 70%)`,
            }}
          />

          <div className="relative z-10">
            <div className="flex justify-center mb-8">
              <div className="p-4 rounded-2xl bg-background/50 border border-border shadow-sm animate-bounce-gentle">
                <Compass className="h-10 w-10 text-primary" />
              </div>
            </div>

            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Perdu dans le vide ?
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Cette page a dérivé hors de notre radar. <br />
                Utilisez vos instruments pour revenir à bon port.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="control-button h-12 px-8 rounded-lg border-border bg-background/50 hover:bg-secondary text-foreground backdrop-blur-md"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>

              <Button
                onClick={() => setLocation("/")}
                className="control-button h-12 px-8 rounded-lg bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 transition-all"
              >
                <Home className="w-4 h-4 mr-2" />
                Accueil
              </Button>
            </div>
          </div>
        </div>

        {/* Coordonnées fictives pour le style pro/innovant */}
        <div className="mt-6 flex justify-between items-center px-4 text-[10px] font-mono text-muted-foreground opacity-50">
          <span>LAT: 40.444 N</span>
          <div className="h-[1px] flex-1 mx-4 bg-border" />
          <span>LONG: 12.001 W</span>
        </div>
      </div>
    </div>
  );
}