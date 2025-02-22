// Avatar options with playful names and colors
export const avatarOptions = [
  { id: 'fox', emoji: '🦊', bg: 'bg-orange-100', color: 'text-orange-500', name: 'Friendly Fox' },
  { id: 'penguin', emoji: '🐧', bg: 'bg-blue-100', color: 'text-blue-500', name: 'Party Penguin' },
  { id: 'unicorn', emoji: '🦄', bg: 'bg-purple-100', color: 'text-purple-500', name: 'Unique Unicorn' },
  { id: 'dragon', emoji: '🐲', bg: 'bg-green-100', color: 'text-green-500', name: 'Dazzling Dragon' },
  { id: 'octopus', emoji: '🐙', bg: 'bg-pink-100', color: 'text-pink-500', name: 'Outgoing Octopus' },
  { id: 'alien', emoji: '👽', bg: 'bg-teal-100', color: 'text-teal-500', name: 'Amazing Alien' },
  { id: 'robot', emoji: '🤖', bg: 'bg-gray-100', color: 'text-gray-500', name: 'Rad Robot' },
  { id: 'monkey', emoji: '🐵', bg: 'bg-yellow-100', color: 'text-yellow-600', name: 'Merry Monkey' },
  { id: 'cat', emoji: '😺', bg: 'bg-amber-100', color: 'text-amber-500', name: 'Cool Cat' },
  { id: 'owl', emoji: '🦉', bg: 'bg-indigo-100', color: 'text-indigo-500', name: 'Wise Owl' },
];

export interface Contact {
  name: string;
  email: string;
  addedAt: number;
  avatar?: string;
}

export const getAvatarForContact = (contact: Contact) => {
  return avatarOptions.find(avatar => avatar.id === contact.avatar) || avatarOptions[0];
};