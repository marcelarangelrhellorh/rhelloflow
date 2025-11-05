import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, QrCode, Link2, Mail, ExternalLink } from "lucide-react";
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

  const copyEmbedCode = () => {
    const embedCode = `<iframe src="${shareLink}" width="100%" height="900" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    toast({ title: "Código copiado!", description: "Código iframe copiado para a área de transferência" });
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.download = `qr-vaga-${vagaId}.png`;
    link.href = qrCodeUrl;
    link.click();
    toast({ title: "QR Code baixado!", description: "QR Code salvo com sucesso" });
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`Confira esta oportunidade: ${vagaTitulo}\n\n${shareLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Oportunidade: ${vagaTitulo}`);
    const body = encodeURIComponent(`Confira esta oportunidade:\n\n${vagaTitulo}\n\n${shareLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="link">Link</TabsTrigger>
              <TabsTrigger value="qr">QR Code</TabsTrigger>
              <TabsTrigger value="embed">Embed</TabsTrigger>
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

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={shareViaWhatsApp} variant="outline" className="w-full">
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </Button>
                <Button onClick={shareViaEmail} variant="outline" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
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

            <TabsContent value="embed" className="space-y-4">
              <div className="space-y-2">
                <Label>Código para incorporar (iframe)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={`<iframe src="${shareLink}" width="100%" height="900" frameborder="0"></iframe>`}
                    readOnly 
                  />
                  <Button onClick={copyEmbedCode} size="icon" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cole este código em seu site para incorporar o formulário de candidatura
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
