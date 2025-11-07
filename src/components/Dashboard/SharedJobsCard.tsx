import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SharedJobsList } from "./SharedJobsList";

export function SharedJobsCard() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    loadCount();
  }, []);

  const loadCount = async () => {
    try {
      setLoading(true);
      
      // Buscar vagas que foram compartilhadas via link
      const { data: vagasCompartilhadas } = await supabase
        .from('share_links')
        .select('vaga_id')
        .eq('deleted', false);
      
      const vagasCount = new Set(vagasCompartilhadas?.map(sl => sl.vaga_id) || []).size;
      setCount(vagasCount);
    } catch (error) {
      console.error("Erro ao carregar contador:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadCount();
  };

  const isClickable = count > 0 && !loading;

  return (
    <>
      <Card 
        className={`
          overflow-hidden border-l-4 border-l-info
          ${isClickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : 'cursor-default'}
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        `}
        onClick={isClickable ? () => setShowList(true) : undefined}
        tabIndex={isClickable ? 0 : -1}
        role={isClickable ? "button" : undefined}
        aria-label={`Vagas compartilhadas (${count} vagas)`}
        title="Vagas com links de divulgação ativos"
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-muted-foreground">Vagas Compartilhadas</p>
              <p className="text-[42px] font-semibold leading-none text-card-foreground">
                {loading ? '...' : count}
              </p>
              <p className="text-[13px] text-muted-foreground">Com link de divulgação ativo</p>
            </div>
            <div className="rounded-full p-4 bg-info/10 text-info transition-transform duration-150">
              <Share2 className="h-7 w-7" />
            </div>
          </div>
        </CardContent>
      </Card>

      <SharedJobsList 
        open={showList} 
        onOpenChange={setShowList}
        onRefresh={handleRefresh}
      />
    </>
  );
}
