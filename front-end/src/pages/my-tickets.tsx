import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/hooks/use-toast";
import { Event } from "@/types/events";
import { API } from "@/utils/api";
import { Formatter } from "@/utils/formatter";
import { CalendarDays, Hash, MapPin, Ticket } from "lucide-react";
import React, { useEffect, useState } from "react";
import notFoundImage from '/public/not-fount.png';

interface TicketType {
  id: string;
  event: Event;
  code: string;
}

const MyTickets: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) return;

      try {
        const response = await API.get(`/tickets`);

        const responseBody: TicketType[] = await response.json();

        if (!response.ok) {
          const errorMessage = Formatter.errorMessage(responseBody, "Erro ao buscar bilhetes");

          toast({
            title: "Erro ao buscar bilhetes",
            description: errorMessage,
            variant: "destructive",
          });

          return;
        }

        setTickets(responseBody);
      } catch (error) {
        console.error("Erro ao buscar bilhetes:", error);

        toast({
          title: "Erro ao buscar bilhetes",
          description: "Ocorreu um erro ao carregar seus bilhetes. Tente novamente mais tarde.",
          variant: "destructive",
        });

        setTickets([]);
      }
    };

    fetchTickets();
  }, [user]);

  if (tickets.length === 0) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-bold text-center mb-8">Meus Bilhetes</h1>

          <div className="text-center py-12">
            <Ticket className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Nenhum bilhete encontrado
            </h2>
            <p className="text-gray-600 mb-8">
              Você ainda não comprou nenhum ingresso.
            </p>
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition-all"
            >
              Explorar Eventos
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-8">Meus Bilhetes</h1>

        <div className="space-y-6">
          {tickets.map((ticket) => {

            return (
              <Card
                key={ticket.id}
                className="bg-white/80 backdrop-blur-sm border-white/20 overflow-hidden"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Event Image */}
                  {ticket.event && (
                    <div className="md:w-48 h-48 md:h-auto">
                      <img
                        src={ticket.event.photos.length > 0 ? ticket.event.photos[0] : notFoundImage}
                        alt={ticket.event.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Ticket Info */}
                  <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {ticket.event.name}
                          </h3>

                          {ticket.event && (
                            <div className="space-y-2">
                              <div className="flex items-center text-sm text-gray-600">
                                <CalendarDays className="w-4 h-4 mr-2" />
                                {Formatter.dateToString(ticket.event.initialDate)}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                {ticket.event.location}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            {Formatter.currency(ticket.event.ticketPrice)}
                          </Badge>
                        </div>
                      </div>

                      {/* Ticket Code */}
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg text-center min-w-[200px]">
                        <div className="flex items-center justify-center mb-2">
                          <Hash className="w-5 h-5 mr-1" />
                          <span className="text-sm font-medium">
                            CÓDIGO DO BILHETE
                          </span>
                        </div>
                        <div className="text-2xl font-bold tracking-wider break-all">
                          {ticket.code}
                        </div>
                        <div className="text-xs opacity-90 mt-2">
                          Apresente este código na entrada
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MyTickets;
