export type WordEntry = {
  word: string
  partOfSpeech: string
  definition: string
  example: string
}

// A curated list of primary-school-friendly vocabulary words.
// Rotates by day-of-year so every child sees the same word on the same day.
export const WORDS: WordEntry[] = [
  { word: 'Curious', partOfSpeech: 'adjective', definition: 'Wanting to learn or know more about something.', example: 'Maya was curious about how bees make honey.' },
  { word: 'Brave', partOfSpeech: 'adjective', definition: 'Showing courage, even when something feels scary.', example: 'It was brave of Tom to read his poem in front of the class.' },
  { word: 'Wander', partOfSpeech: 'verb', definition: 'To walk around slowly without a clear plan.', example: 'We wandered through the park looking for conkers.' },
  { word: 'Gigantic', partOfSpeech: 'adjective', definition: 'Extremely large.', example: 'The dinosaur left a gigantic footprint in the mud.' },
  { word: 'Whisper', partOfSpeech: 'verb', definition: 'To speak very softly, so only nearby people can hear.', example: 'She whispered the secret into her friend’s ear.' },
  { word: 'Journey', partOfSpeech: 'noun', definition: 'A trip from one place to another, especially a long one.', example: 'Our journey to Grandma’s house took three hours.' },
  { word: 'Fragile', partOfSpeech: 'adjective', definition: 'Easily broken or damaged.', example: 'Please carry the fragile eggs carefully.' },
  { word: 'Marvellous', partOfSpeech: 'adjective', definition: 'Extremely good or wonderful.', example: 'Ella did a marvellous job on her art project.' },
  { word: 'Discover', partOfSpeech: 'verb', definition: 'To find something for the first time.', example: 'Scientists discover new sea creatures every year.' },
  { word: 'Sparkle', partOfSpeech: 'verb', definition: 'To shine with tiny flashes of light.', example: 'Fresh snow made the garden sparkle.' },
  { word: 'Kindness', partOfSpeech: 'noun', definition: 'The quality of being friendly, generous and caring.', example: 'A little kindness can make someone’s whole day.' },
  { word: 'Enormous', partOfSpeech: 'adjective', definition: 'Very, very big.', example: 'An enormous whale swam past the boat.' },
  { word: 'Puzzle', partOfSpeech: 'noun', definition: 'A problem or game you have to think hard to solve.', example: 'This maths puzzle was tricky but fun.' },
  { word: 'Blossom', partOfSpeech: 'verb', definition: 'To grow, open up, or develop beautifully.', example: 'With practice, her reading really began to blossom.' },
  { word: 'Delightful', partOfSpeech: 'adjective', definition: 'Very pleasing and enjoyable.', example: 'We had a delightful picnic by the river.' },
  { word: 'Explore', partOfSpeech: 'verb', definition: 'To travel somewhere to learn about it.', example: 'Let’s explore the woods behind the school.' },
  { word: 'Gentle', partOfSpeech: 'adjective', definition: 'Kind, soft, and careful.', example: 'Be gentle when you stroke the puppy.' },
  { word: 'Imagine', partOfSpeech: 'verb', definition: 'To picture something in your mind.', example: 'Imagine a world where books could talk.' },
  { word: 'Peculiar', partOfSpeech: 'adjective', definition: 'Strange or unusual.', example: 'The soup had a peculiar taste.' },
  { word: 'Bustling', partOfSpeech: 'adjective', definition: 'Full of busy activity.', example: 'The market was bustling on Saturday morning.' },
  { word: 'Grateful', partOfSpeech: 'adjective', definition: 'Feeling thankful for something.', example: 'I am grateful for my kind friends.' },
  { word: 'Adventure', partOfSpeech: 'noun', definition: 'An exciting or unusual experience.', example: 'Our camping trip turned into a real adventure.' },
  { word: 'Whisker', partOfSpeech: 'noun', definition: 'One of the long, stiff hairs near the mouth of some animals.', example: 'The cat’s whiskers twitched as she sniffed the food.' },
  { word: 'Nibble', partOfSpeech: 'verb', definition: 'To take small bites of something.', example: 'The rabbit nibbled on a piece of carrot.' },
  { word: 'Twinkle', partOfSpeech: 'verb', definition: 'To shine with a light that keeps changing from bright to less bright.', example: 'The stars twinkled above the tent.' },
  { word: 'Cheerful', partOfSpeech: 'adjective', definition: 'Happy and full of good spirits.', example: 'Ms Betty always gives us a cheerful welcome.' },
  { word: 'Scramble', partOfSpeech: 'verb', definition: 'To move or climb quickly, often using your hands.', example: 'The children scrambled up the rocks.' },
  { word: 'Wonder', partOfSpeech: 'noun', definition: 'A feeling of surprise mixed with admiration.', example: 'She stared at the fireworks in wonder.' },
  { word: 'Muddle', partOfSpeech: 'noun', definition: 'A confused or messy state.', example: 'My schoolbag is in a real muddle today.' },
  { word: 'Precious', partOfSpeech: 'adjective', definition: 'Very valuable or greatly loved.', example: 'Family photos are precious to me.' },
  { word: 'Glimmer', partOfSpeech: 'noun', definition: 'A faint or unsteady light.', example: 'A glimmer of sunlight came through the curtains.' },
  { word: 'Rescue', partOfSpeech: 'verb', definition: 'To save someone or something from danger.', example: 'The firefighters rescued the kitten from the tree.' },
  { word: 'Determined', partOfSpeech: 'adjective', definition: 'Firmly decided to do something.', example: 'He was determined to learn his times tables.' },
  { word: 'Fantastic', partOfSpeech: 'adjective', definition: 'Extremely good; wonderful.', example: 'You did a fantastic job on your spellings.' },
  { word: 'Scurry', partOfSpeech: 'verb', definition: 'To move quickly with short, hurried steps.', example: 'Mice scurried across the barn floor.' },
  { word: 'Splendid', partOfSpeech: 'adjective', definition: 'Magnificent; very impressive.', example: 'What a splendid drawing you’ve made!' },
  { word: 'Timid', partOfSpeech: 'adjective', definition: 'Shy and easily frightened.', example: 'The timid deer stayed near the trees.' },
  { word: 'Chatter', partOfSpeech: 'verb', definition: 'To talk quickly and continuously about unimportant things.', example: 'The friends chattered all the way home.' },
  { word: 'Wobble', partOfSpeech: 'verb', definition: 'To move unsteadily from side to side.', example: 'The jelly wobbled on the plate.' },
  { word: 'Astonish', partOfSpeech: 'verb', definition: 'To surprise someone greatly.', example: 'The magician’s trick astonished the whole class.' },
  { word: 'Glisten', partOfSpeech: 'verb', definition: 'To shine because of being wet or oily.', example: 'Dew glistened on the spider’s web.' },
  { word: 'Delicate', partOfSpeech: 'adjective', definition: 'Very fine in texture; easily broken.', example: 'Butterflies have delicate wings.' },
]

export function getWordOfTheDay(now: Date = new Date()): WordEntry {
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return WORDS[dayOfYear % WORDS.length]
}
