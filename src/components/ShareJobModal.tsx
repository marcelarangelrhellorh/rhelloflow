import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, QrCode, Link2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";

interface ShareJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vagaId: string;
  vagaTitulo: string;
}

export function ShareJobModal({ open, onOpenChange, vagaId, vagaTitulo }: ShareJobModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string>("");
  const [linkId, setLinkId] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  
  // Configurações do link
  const [password, setPassword] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [maxSubmissions, setMaxSubmissions] = useState<number | undefined>();
  const [usePassword, setUsePassword] = useState(false);
  const [useExpiration, setUseExpiration] = useState(true);
  const [useMaxSubmissions, setUseMaxSubmissions] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Erro", description: "Você precisa estar autenticado", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-share-link', {
        body: {
          vaga_id: vagaId,
          password: usePassword ? password : null,
          expires_in_days: useExpiration ? expiresInDays : null,
          max_submissions: useMaxSubmissions ? maxSubmissions : null,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setShareLink(data.url);
      setLinkId(data.id);
      
      // Gerar QR Code
      const qrUrl = await QRCode.toDataURL(data.url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#00141D',
          light: '#FFFDF6',
        },
      });
      setQrCodeUrl(qrUrl);

      toast({ title: "Link gerado!", description: "Link de compartilhamento criado com sucesso" });
    } catch (error) {
      console.error('Error generating link:', error);
      toast({ 
        title: "Erro", 
        description: error instanceof Error ? error.message : "Erro ao gerar link", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({ title: "Link copiado!", description: "Link copiado para a área de transferência" });
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.download = `qr-vaga-${vagaId}.png`;
    link.href = qrCodeUrl;
    link.click();
    toast({ title: "QR Code baixado!", description: "QR Code salvo com sucesso" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar Vaga</DialogTitle>
          <DialogDescription>
            Crie um link público para compartilhar esta vaga com candidatos
          </DialogDescription>
        </DialogHeader>

        {!shareLink ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-expiration">Definir data de expiração</Label>
                <Switch
                  id="use-expiration"
                  checked={useExpiration}
                  onCheckedChange={setUseExpiration}
                />
              </div>
              {useExpiration && (
                <div>
                  <Label htmlFor="expiration">Expira em (dias)</Label>
                  <Input
                    id="expiration"
                    type="number"
                    min="1"
                    max="365"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-password">Proteger com senha</Label>
                <Switch
                  id="use-password"
                  checked={usePassword}
                  onCheckedChange={setUsePassword}
                />
              </div>
              {usePassword && (
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Digite uma senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-max">Limitar número de inscrições</Label>
                <Switch
                  id="use-max"
                  checked={useMaxSubmissions}
                  onCheckedChange={setUseMaxSubmissions}
                />
              </div>
              {useMaxSubmissions && (
                <div>
                  <Label htmlFor="max-submissions">Máximo de inscrições</Label>
                  <Input
                    id="max-submissions"
                    type="number"
                    min="1"
                    placeholder="Ex: 100"
                    value={maxSubmissions || ''}
                    onChange={(e) => setMaxSubmissions(parseInt(e.target.value))}
                  />
                </div>
              )}
            </div>

            <Button onClick={generateLink} disabled={loading} className="w-full">
              {loading ? "Gerando..." : "Gerar Link de Compartilhamento"}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="link" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link">Link</TabsTrigger>
              <TabsTrigger value="qr">QR Code</TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-4">
              <div className="space-y-2">
                <Label>Link público</Label>
                <div className="flex gap-2">
                  <Input value={shareLink} readOnly />
                  <Button onClick={copyLink} size="icon" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => window.open(shareLink, '_blank')} 
                    size="icon" 
                    variant="outline"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64 border rounded" />
                <Button onClick={downloadQRCode} variant="outline">
                  <QrCode className="h-4 w-4 mr-2" />
                  Baixar QR Code
                </Button>
              </div>
            </TabsContent>

          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
