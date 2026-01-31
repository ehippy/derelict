import Home from "../page";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { guildSlug: string };
}): Promise<Metadata> {
  // Extract guild name from slug (everything before last hyphen)
  const lastHyphenIndex = params.guildSlug.lastIndexOf('-');
  const guildName = lastHyphenIndex > 0 
    ? params.guildSlug.slice(0, lastHyphenIndex).replace(/-/g, ' ')
    : 'Server';

  return {
    title: `${guildName} | D E R E L I C T`,
    description: `Play D E R E L I C T on ${guildName}`,
  };
}

export default Home;
