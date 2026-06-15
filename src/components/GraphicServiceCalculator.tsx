import { useState, useEffect } from "react";
import { Trash2, RotateCcw, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Tipos de serviços com valores mínimos
const SERVICES = {
  adesivo: { label: "Adesivo", minValue: 5.0 },
  banner: { label: "Banner", minValue: 15.0 },
  lona: { label: "Lona", minValue: 20.0 },
  vinil: { label: "Vinil", minValue: 10.0 },
  impressao: { label: "Impressão", minValue: 8.0 },
};

interface CalculationHistory {
  id: string;
  service: string;
  width: number;
  height: number;
  quantity: number;
  pricePerM2: number;
  unitArea: number;
  totalArea: number;
  finalValue: number;
  timestamp: Date;
}

export function GraphicServiceCalculator() {
  const [service, setService] = useState<keyof typeof SERVICES>("adesivo");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pricePerM2, setPricePerM2] = useState("");

  const [result, setResult] = useState<{
    unitArea: number;
    totalArea: number;
    finalValue: number;
    appliedMinimum: boolean;
  } | null>(null);

  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Carregar histórico do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("calculator-history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(
          parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          })),
        );
      } catch (e) {
        console.error("Erro ao carregar histórico", e);
      }
    }
  }, []);

  // Salvar histórico no localStorage
  useEffect(() => {
    localStorage.setItem("calculator-history", JSON.stringify(history));
  }, [history]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const validateInputs = () => {
    if (!width || !height || !quantity || !pricePerM2) {
      toast.error("Preencha todos os campos");
      return false;
    }

    const w = parseFloat(width);
    const h = parseFloat(height);
    const q = parseFloat(quantity);
    const p = parseFloat(pricePerM2);

    if (w <= 0 || h <= 0 || q <= 0 || p <= 0) {
      toast.error("Os valores devem ser maiores que zero");
      return false;
    }

    return true;
  };

  const calculate = () => {
    if (!validateInputs()) return;

    const w = parseFloat(width);
    const h = parseFloat(height);
    const q = parseFloat(quantity);
    const p = parseFloat(pricePerM2);

    // Converter cm para metros
    const widthMeter = w / 100;
    const heightMeter = h / 100;

    // Calcular áreas
    const unitArea = widthMeter * heightMeter;
    const totalArea = unitArea * q;

    // Calcular valor
    let finalValue = totalArea * p;

    // Aplicar valor mínimo se necessário
    const minValue = SERVICES[service].minValue;
    const appliedMinimum = finalValue < minValue;

    if (appliedMinimum) {
      finalValue = minValue;
    }

    setResult({
      unitArea,
      totalArea,
      finalValue,
      appliedMinimum,
    });

    // Adicionar ao histórico
    const newEntry: CalculationHistory = {
      id: Date.now().toString(),
      service: SERVICES[service].label,
      width: w,
      height: h,
      quantity: q,
      pricePerM2: p,
      unitArea,
      totalArea,
      finalValue,
      timestamp: new Date(),
    };

    setHistory((prev) => [newEntry, ...prev.slice(0, 19)]);
    toast.success("Cálculo realizado com sucesso!");
  };

  const clear = () => {
    setWidth("");
    setHeight("");
    setQuantity("");
    setPricePerM2("");
    setResult(null);
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `${SERVICES[service].label}\nLargura: ${width}cm\nAltura: ${height}cm\nQuantidade: ${quantity}\nValor m²: ${formatCurrency(parseFloat(pricePerM2))}\n\nÁrea unitária: ${formatNumber(result.unitArea)} m²\nÁrea total: ${formatNumber(result.totalArea)} m²\nTotal: ${formatCurrency(result.finalValue)}${result.appliedMinimum ? " (valor mínimo aplicado)" : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const downloadPDF = () => {
    if (!result) return;
    // Implementar download de PDF futuramente
    toast.info("Recurso de PDF em desenvolvimento");
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    toast.success("Item removido do histórico");
  };

  const clearHistory = () => {
    setHistory([]);
    toast.success("Histórico limpo");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calculadora Principal */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-border">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-brand-blue mb-2">
                  Calculadora de Serviços Gráficos
                </h1>
                <p className="text-muted-foreground">
                  Calcule o valor de seus produtos com precisão
                </p>
              </div>

              {/* Formulário */}
              <div className="space-y-5">
                {/* Tipo de Serviço */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Tipo de Serviço *
                  </Label>
                  <Select value={service} onValueChange={(v: any) => setService(v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICES).map(([key, { label, minValue }]) => (
                        <SelectItem key={key} value={key}>
                          {label} (Mín: {formatCurrency(minValue)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grid de Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Largura (cm) *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 90"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Altura (cm) *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 100"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Quantidade *
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="Ex: 1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Valor do m² *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 105"
                      value={pricePerM2}
                      onChange={(e) => setPricePerM2(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={calculate}
                    className="flex-1 h-12 bg-gradient-to-r from-brand-yellow to-brand-orange hover:opacity-90 text-brand-blue font-bold text-lg rounded-xl"
                  >
                    Calcular
                  </Button>
                  <Button
                    onClick={clear}
                    variant="outline"
                    className="h-12 rounded-xl"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Limpar
                  </Button>
                </div>
              </div>

              {/* Resultado */}
              {result && (
                <div className="mt-8 pt-8 border-t-2 border-brand-yellow">
                  <div className="bg-gradient-to-br from-brand-blue/5 to-brand-yellow/5 rounded-xl p-6 border border-brand-yellow/20">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground font-semibold mb-1">
                          Área Unitária
                        </p>
                        <p className="text-2xl font-bold text-brand-blue">
                          {formatNumber(result.unitArea)} m²
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground font-semibold mb-1">
                          Área Total
                        </p>
                        <p className="text-2xl font-bold text-brand-blue">
                          {formatNumber(result.totalArea)} m²
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground font-semibold mb-1">
                          Valor do m²
                        </p>
                        <p className="text-2xl font-bold text-brand-blue">
                          {formatCurrency(parseFloat(pricePerM2))}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground font-semibold mb-1">
                          Quantidade
                        </p>
                        <p className="text-2xl font-bold text-brand-blue">
                          {quantity}
                        </p>
                      </div>
                    </div>

                    {/* Valor Final em Destaque */}
                    <div className="bg-gradient-to-r from-brand-yellow to-brand-orange rounded-xl p-8 text-center mb-4">
                      <p className="text-white/80 text-sm font-semibold mb-2">
                        VALOR FINAL
                      </p>
                      <p className="text-5xl font-black text-brand-blue">
                        {formatCurrency(result.finalValue)}
                      </p>
                      {result.appliedMinimum && (
                        <p className="text-xs text-brand-blue/70 mt-3 font-semibold">
                          ⚠️ Valor mínimo aplicado
                        </p>
                      )}
                    </div>

                    {/* Botões de Resultado */}
                    <div className="flex gap-2">
                      <Button
                        onClick={copyToClipboard}
                        variant="outline"
                        className="flex-1"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar
                      </Button>
                      <Button
                        onClick={downloadPDF}
                        variant="outline"
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Histórico */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-border sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-brand-blue">Histórico</h2>
                {history.length > 0 && (
                  <Button
                    onClick={() => setShowHistory(!showHistory)}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    {showHistory ? "Ocultar" : "Ver"}
                  </Button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    Nenhum cálculo realizado ainda
                  </p>
                </div>
              ) : (
                <>
                  {showHistory && (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="bg-muted/50 rounded-lg p-3 border border-border/50 hover:border-border transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-brand-blue truncate">
                                {item.service}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.width}×{item.height}cm × {item.quantity}
                              </p>
                            </div>
                            <Button
                              onClick={() => deleteHistoryItem(item.id)}
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                          <p className="text-lg font-bold text-brand-yellow">
                            {formatCurrency(item.finalValue)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.timestamp.toLocaleTimeString("pt-BR")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {showHistory && history.length > 0 && (
                    <Button
                      onClick={clearHistory}
                      variant="outline"
                      size="sm"
                      className="w-full mt-4 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Limpar Histórico
                    </Button>
                  )}

                  {!showHistory && (
                    <div className="space-y-1">
                      {history.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center text-xs p-2 bg-muted/30 rounded"
                        >
                          <span className="text-muted-foreground truncate">
                            {item.service}
                          </span>
                          <span className="font-bold text-brand-yellow">
                            {formatCurrency(item.finalValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dicas de Uso */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900 font-semibold mb-2">💡 Dicas:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>
              • As medidas devem ser informadas em centímetros (cm)
            </li>
            <li>
              • Cada serviço possui um valor mínimo que será aplicado automaticamente
            </li>
            <li>
              • O histórico é salvo automaticamente no seu navegador
            </li>
            <li>
              • Clique em "Copiar" para compartilhar o resultado com o cliente
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
