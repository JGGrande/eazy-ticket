import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin } from "lucide-react";
import { Event } from "@/types/events";
import { Formatter } from "@/utils/formatter";
import notFoundImage from '@/../public/not-fount.png'; // Placeholder image for not found events

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  return (
    <Link to={`/event/${event.id}`} className="block group">
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 bg-white/80 backdrop-blur-sm border-white/20">
        <div className="relative h-48 overflow-hidden">
          <img
            src={event.photos.length > 0 ? event.photos[0] : notFoundImage}
            alt={event.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-white/90 text-gray-800">
              {Formatter.currency(event.ticketPrice)}
            </Badge>
          </div>
        </div>

        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
            {event.name}
          </h3>

          <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-500">
              <CalendarDays className="w-4 h-4 mr-2" />
              {Formatter.dateToString(event.initialDate)}
              {event.initialDate !== event.finalDate &&
                ` - ${Formatter.dateToString(event.finalDate)}`}
            </div>

            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="w-4 h-4 mr-2" />
              {event.location}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default EventCard;
