export class DateUtils {
  public static isBefore(date1: Date, date2: Date): boolean {
    return date1 < date2;
  }

  public static isAfter(date1: Date, date2: Date): boolean {
    return date1 > date2;
  }

  public static isPast(date: Date): boolean {
    const now = new Date();
    return date < now;
  }

  public static isAfterNow(date: Date): boolean {
    const now = new Date();
    return date > now;
  }
}