import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface AddToGoogleCalendarProps {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  className?: string;
}

export function AddToGoogleCalendar({
  title,
  description = "",
  location = "",
  startDate,
  endDate,
  className,
}: AddToGoogleCalendarProps) {
  const generateGoogleCalendarUrl = () => {
    // Formato: YYYYMMDDTHHmmssZ
    const formatDateForGoogle = (date: Date) => {
      return format(date, "yyyyMMdd'T'HHmmss'Z'");
    };

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      details: description,
      location: location,
      dates: `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const handleAddToCalendar = () => {
    const url = generateGoogleCalendarUrl();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      onClick={handleAddToCalendar}
      variant="outline"
      className={className}
    >
      <Calendar size={18} className="mr-2" />
      Adicionar ao Google Calendar
    </Button>
  );
}

// Hook para usar em qualquer lugar
export function useGoogleCalendar() {
  const addToGoogleCalendar = ({
    title,
    description = "",
    location = "",
    startDate,
    endDate,
  }: AddToGoogleCalendarProps) => {
    const formatDateForGoogle = (date: Date) => {
      return format(date, "yyyyMMdd'T'HHmmss'Z'");
    };

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      details: description,
      location: location,
      dates: `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`,
    });

    const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return { addToGoogleCalendar };
}
