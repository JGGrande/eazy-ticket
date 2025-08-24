import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Event } from "@/types/events";
import { Formatter } from "@/utils/formatter";
import { API } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import notFoundImage from "@/../public/not-found.png";
import { Spinner } from "@/components/ui/spinner";

const EventDetails: React.FC = () => {
  const { id: eventId } = useParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;

      setIsLoading(true);
      try {
        const url = API.getAPIUrl(`/public/events/${eventId}`);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json() as Event;

        if (!response.ok) {
          const errorMessage = Formatter.errorMessage(data);

          toast({
            title: "Erro ao buscar eventos",
            description: errorMessage,
            variant: "destructive",
          });

          return;
        }

        setEvent(data);
      } catch (error) {
        console.error("Erro ao buscar evento:", error);
        setEvent(null);
        toast({
          title: "Erro ao buscar evento",
          description: "Ocorreu um erro ao carregar os detalhes do evento. Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  if (isLoading) {
    return (
      <Spinner />
    )
  }

  if (!event && !isLoading) {
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

  const handleBuyTicket = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate(`/checkout/${event.id}`);
  };

  const initialDateTime = Formatter.dateAndTime(event.initialDate);
  const finalDateTime = Formatter.dateAndTime(event.finalDate);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden">
              <img
                src={
                  event.photos.length > 0
                  ? event.photos[currentImageIndex]
                  : notFoundImage
                }
                alt={event.name}
                className="w-full h-full object-cover"
              />
            </div>

            {event.photos?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {event.photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      currentImageIndex === index
                        ? "border-primary"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`${event.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Event Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {event.name}
              </h1>
              <p className="text-lg text-gray-700 leading-relaxed">
                {event.description}
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-gray-900">
                    {initialDateTime.date}
                    {event.initialDate !== event.finalDate &&
                      ` - ${finalDateTime.date}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {initialDateTime.time}
                    {event.initialDate !== event.finalDate &&
                      ` - ${finalDateTime.time}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <p className="text-gray-900">{event.location}</p>
              </div>

              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold text-gray-900">
                  {Formatter.currency(event.ticketPrice)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleBuyTicket}
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {user ? "Comprar Ingresso" : "Fazer Login para Comprar"}
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="w-full"
              >
                Voltar aos Eventos
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
