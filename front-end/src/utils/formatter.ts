export class Formatter {
  static errorMessage(error: unknown, defaultMessage?: string): string {
    if (typeof error === 'object') {
      if('error' in error){
        return error.error as string;
      }

      if ('errors' in error && Array.isArray(error.errors)) {
        return (error.errors as string[]).join(', ');
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return defaultMessage || 'An unknown error occurred';
  }

  static dateToString(dateString: string): string {
    const date = new Date(dateString);

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  static dateAndTime(dateString: string): { date: string; time: string } {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };


  static currency(amount: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  }
}