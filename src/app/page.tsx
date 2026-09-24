import { Approach } from '@/components/sections/approach';
import { BookingSteps } from '@/components/sections/booking-steps';
import { Hero } from '@/components/sections/hero';
import { Location } from '@/components/sections/location';
import { Services } from '@/components/sections/services';
import { WhatsAppCTA } from '@/components/sections/whatsapp-cta';
import { listActiveServices } from '@/lib/booking/catalog';

/**
 * Landing page: hero → services → how booking works → experience →
 * WhatsApp → location. Services are resolved on the server so the page is fully
 * rendered (and indexable) even before the client bundle hydrates.
 */
export default async function HomePage() {
  const services = await listActiveServices();

  return (
    <>
      <Hero />
      <Services services={services} limit={6} />
      <BookingSteps />
      <Approach />
      <WhatsAppCTA />
      <Location />
    </>
  );
}
