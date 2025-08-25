import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import EventCard from "@/components/event-card";
import { Event } from "@/types/events";
import { API } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { Formatter } from "@/utils/formatter";
import { Spinner } from "@/components/ui/spinner";

const Index: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [events, searchTerm]);

  const noEventsFound = events.length === 0 && !isLoading;

  const hasEvents = events.length > 0;

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const url = API.getAPIUrl("/public/events");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json() as Event[];

      if (!response.ok) {
        const errorMessage = Formatter.errorMessage(data);

        toast({
          title: "Erro ao buscar eventos",
          description: errorMessage,
          variant: "destructive",
        });

        return;
      }

      setEvents(data);
    } catch (error) {
      console.error("Erro ao buscar eventos:", error);

      toast({
        title: "Erro ao buscar eventos",
        description: "Ocorreu um erro ao carregar os eventos. Tente novamente mais tarde.",
        variant: "destructive",
      });

      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">Bilhete Fácil</h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Descubra e compre ingressos para os melhores eventos
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-6 text-lg bg-white/90 backdrop-blur-sm border-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Eventos Disponíveis
          </h2>

          {isLoading && <Spinner />}

          {hasEvents && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(searchTerm ? filteredEvents : events).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          {noEventsFound && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">Nenhum evento encontrado</p>
              <p className="text-gray-500">Tente alterar o termo de busca</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
