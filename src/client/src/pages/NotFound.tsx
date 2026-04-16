import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Compass, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * 404 Not Found page with a parallax effect that responds to mouse movement.
 * Easter egg: coordinates point to the Martyrs' Monument in Burkina Faso.
 * Clicking them opens a modal or external link to learn more.
 */
export default function NotFound() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [showModal, setShowModal] = useState(false);

  // Track mouse position to create a parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / 50;
      const y = (e.clientY - window.innerHeight / 2) / 50;
      setOffset({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Coordinates of the Martyrs' Monument (Ouagadougou, Burkina Faso)
  const monumentLat = 12.3952;
  const monumentLng = -1.5581;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background">
      
      {/* --- BACKGROUND: Giant "404" with opposite movement for depth --- */}
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

      {/* --- COLOR ACCENTS: Floating blurred circles with slight movement --- */}
      <div 
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-chart-1 opacity-20 blur-[100px] animate-bounce-gentle"
        style={{ transform: `translate(${offset.x * 0.5}px, ${offset.y * 0.5}px)` }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-chart-3 opacity-20 blur-[100px]"
        style={{ transform: `translate(${offset.x * -0.8}px, ${offset.y * -0.8}px)` }}
      />

      {/* --- MAIN CONTENT --- */}
      <div 
        className="relative z-10 w-full max-w-lg mx-4 transition-transform duration-300 ease-out"
        style={{ 
          transform: `translate(${offset.x}px, ${offset.y}px)`,
        }}
      >
        <div className="glass border border-border p-8 md:p-12 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-scale-in overflow-hidden">
          
          {/* Inner glow that follows the cursor */}
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
                {t('notFound.title', 'Lost in the void?')}
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t('notFound.message', 'This page has drifted off our radar. Use your instruments to return to safe harbor.')}
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="control-button h-12 px-8 rounded-lg border-border bg-background/50 hover:bg-secondary text-foreground backdrop-blur-md"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('notFound.back', 'Go Back')}
              </Button>

              <Button
                onClick={() => setLocation("/")}
                className="control-button h-12 px-8 rounded-lg bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 transition-all"
              >
                <Home className="w-4 h-4 mr-2" />
                {t('notFound.home', 'Home')}
              </Button>
            </div>
          </div>
        </div>

        {/* Easter egg: coordinates that point to the Martyrs' Monument */}
        <div className="mt-6 flex justify-between items-center px-4 text-[10px] font-mono text-muted-foreground opacity-50 group">
          <span
            className="cursor-pointer hover:text-primary transition-colors duration-200"
            onClick={() => setShowModal(true)}
          >
            LAT: {monumentLat.toFixed(4)}° N
          </span>
          <div className="h-[1px] flex-1 mx-4 bg-border" />
          <span
            className="cursor-pointer hover:text-primary transition-colors duration-200"
            onClick={() => setShowModal(true)}
          >
            LONG: {Math.abs(monumentLng).toFixed(4)}° W
          </span>
        </div>
      </div>

      {/* Modal for the easter egg */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-background border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Compass className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                {t('notFound.modalTitle', 'Monument des Martyrs')}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t('notFound.modalText', 'These coordinates lead to the Martyrs\' Monument in Ouagadougou, Burkina Faso – a memorial to those who sacrificed for freedom. A place of remembrance and hope.')}
              </p>
              <a
                href="https://www.openstreetmap.org/?mlat=12.3952&mlon=-1.5581#map=15/12.3952/-1.5581"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
              >
                {t('notFound.modalLink', 'View on map')}
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}