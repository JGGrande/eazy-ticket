import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Smartphone, Minus, Plus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Event } from "@/types/events";
import { API } from "@/utils/api";
import { Formatter } from "@/utils/formatter";
import notFoundImage from '/public/not-fount.png';

const Checkout: React.FC = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [ticketCount, setTicketCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [isLoading, setIsLoading] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;

      try {
        const response = await API.get(`/events/${eventId}`);

        const responseBody = await response.json() as Event;

        if (!response.ok) {
          const errorMessage = Formatter.errorMessage(responseBody, "Erro ao buscar evento");

          toast({
            title: "Erro ao buscar evento",
            description: errorMessage,
            variant: "destructive",
          });

          return;
        }

        setEvent(responseBody);
      } catch (error) {
        console.error("Erro ao buscar evento:", error);

        setEvent(null);

        toast({
          title: "Erro ao buscar evento",
          description: "Ocorreu um erro ao carregar os detalhes do evento. Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    };

    fetchEvent();
  }, [eventId, ticketCount, paymentMethod]);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Evento não encontrado
          </h1>
          <Button onClick={() => navigate("/")}>Voltar para eventos</Button>
        </div>
      </div>
    );
  }

  const totalPrice = event.ticketPrice * ticketCount;

  const handleTicketCountChange = (change: number) => {
    const newCount = ticketCount + change;
    if (newCount >= 1 && newCount <= 10) {
      setTicketCount(newCount);
    }
  };

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      const response = await API.post("/checkout", {
        eventId: event.id,
        ticketCount,
        paymentMethod,
      });

      const responseBody = await response.json();

      if (response.status !== 201) {
        const errorMessage = Formatter.errorMessage(responseBody, "Erro na compra");

        toast({
          title: "Erro na compra",
          description: errorMessage,
          variant: "destructive",
        });

        return;
      }

      toast({
        title: "Compra realizada com sucesso!",
        description: `${ticketCount} ingresso(s) adquirido(s) para ${event.name}`,
      });

      navigate("/my-tickets");
    } catch {
      toast({
        title: "Erro na compra",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-8">
          Finalizar Compra
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event Summary */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle>Resumo do Evento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <img
                  src={event.photos.length > 0 ? event.photos[0]: notFoundImage}
                  alt={event.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div>
                  <h3 className="font-bold text-lg">{event.name}</h3>
                  <p className="text-gray-600">{event.location}</p>
                  <p className="text-primary font-semibold">
                    {Formatter.currency(event.ticketPrice)}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <Label>Quantidade de ingressos</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTicketCountChange(-1)}
                      disabled={ticketCount <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-xl font-bold w-8 text-center">
                      {ticketCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTicketCountChange(1)}
                      disabled={ticketCount >= 10}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total:</span>
                  <span>{Formatter.currency(totalPrice)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle>Método de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
              >
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="credit_card" id="credit_card" />
                  <Label
                    htmlFor="credit_card"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-5 h-5" />
                    Cartão de Crédito
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="debit_card" id="debit_card" />
                  <Label
                    htmlFor="debit_card"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-5 h-5" />
                    Cartão de Débito
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label
                    htmlFor="pix"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Smartphone className="w-5 h-5" />
                    PIX
                  </Label>
                </div>
              </RadioGroup>

              {(paymentMethod === "credit_card" ||
                paymentMethod === "debit_card") && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cardNumber">Número do cartão</Label>
                    <Input id="cardNumber" placeholder="0000 0000 0000 0000" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry">Validade</Label>
                      <Input id="expiry" placeholder="MM/AA" />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input id="cvv" placeholder="000" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cardName">Nome no cartão</Label>
                    <Input id="cardName" placeholder="Nome como no cartão" />
                  </div>
                </div>
              )}

              {paymentMethod === "pix" && (
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Após confirmar a compra, você receberá o código PIX para
                    pagamento
                  </p>
                </div>
              )}

              <Button
                onClick={handleCheckout}
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  `Finalizar Compra - ${Formatter.currency(totalPrice)}`
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
