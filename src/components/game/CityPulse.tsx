import { WorldEventFeed } from './WorldEventFeed';

export function CityPulse({ cityName, cityId }: { cityName: string; cityId: string }) {
  return <WorldEventFeed cityId={cityId} cityName={cityName} />;
}
