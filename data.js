'use strict';
/**
 * Kasoti knowledge base: famous people and places from India and Pakistan.
 * Used by engine.js (the "AI Keeper") to pick a secret and answer yes/no questions offline.
 *
 * Record shape
 *   person: P(name, aliases, country, gender, birthYear, deathYear|null, birthplace, tags, level, info)
 *   place : L(name, aliases, country, year|null, location, tags, level, info)
 *   level : 1 = very famous (easy), 2 = well known (medium), 3 = harder
 *   tags  : space-separated canonical tags (see BASE in engine.js; scripts/validate-data.js enforces this)
 * Years are CE; negative = BCE. For places, `year` is the (approximate) year built/founded/formed.
 */
const P = (n, al, c, g, b, d, from, tags, lv, info) => ({ type: 'person', n, al, c, g, b, d, from, tags: tags.split(' '), lv, info });
const L = (n, al, c, y, loc, tags, lv, info) => ({ type: 'place', n, al, c, y, loc, tags: tags.split(' '), lv, info });

const PEOPLE = [
  // ---- India
  P('Mahatma Gandhi', ['gandhi', 'bapu', 'mohandas gandhi', 'mohandas karamchand gandhi'], 'india', 'm', 1869, 1948, 'Porbandar, Gujarat', 'freedom-fighter lawyer activist assassinated writer', 1, "Led India's non-violent struggle for independence from British rule and is known as the Father of the Nation. He was assassinated in Delhi in 1948."),
  P('Jawaharlal Nehru', ['nehru', 'pandit nehru', 'chacha nehru'], 'india', 'm', 1889, 1964, 'Prayagraj, Uttar Pradesh', 'freedom-fighter politician prime-minister lawyer writer', 1, 'The first Prime Minister of independent India (1947-1964) and a central leader of the freedom movement.'),
  P('Sardar Vallabhbhai Patel', ['sardar patel', 'vallabhbhai patel', 'patel', 'iron man of india'], 'india', 'm', 1875, 1950, 'Nadiad, Gujarat', 'freedom-fighter politician lawyer', 2, 'Called the Iron Man of India, he helped unite hundreds of princely states into the Indian Union. The Statue of Unity honours him.'),
  P('B. R. Ambedkar', ['ambedkar', 'dr ambedkar', 'babasaheb', 'babasaheb ambedkar', 'bhimrao ambedkar', 'br ambedkar'], 'india', 'm', 1891, 1956, 'Mhow, Madhya Pradesh', 'politician lawyer social-reformer writer', 2, 'Chief architect of the Indian Constitution, a jurist and social reformer who campaigned against caste discrimination.'),
  P('Subhas Chandra Bose', ['netaji', 'bose', 'subhash chandra bose', 'netaji subhas chandra bose'], 'india', 'm', 1897, 1945, 'Cuttack, Odisha', 'freedom-fighter politician', 2, 'Known as Netaji, he led the Indian National Army against British rule. The circumstances of his death in 1945 are still debated.'),
  P('Bhagat Singh', ['shaheed bhagat singh', 'bhagat'], 'india', 'm', 1907, 1931, 'Banga, Punjab', 'freedom-fighter executed', 2, 'A young revolutionary who became a symbol of resistance to British rule; he was hanged in Lahore at the age of 23.'),
  P('Rani Lakshmibai', ['jhansi ki rani', 'rani of jhansi', 'lakshmibai', 'manikarnika'], 'india', 'f', 1828, 1858, 'Varanasi, Uttar Pradesh', 'freedom-fighter ruler', 2, 'The queen of Jhansi who fought British forces in the Indian Rebellion of 1857 and died in battle in 1858.'),
  P('Rabindranath Tagore', ['tagore', 'gurudev', 'rabindranath thakur'], 'india', 'm', 1861, 1941, 'Kolkata, West Bengal', 'poet writer musician nobel-laureate', 1, "Poet who wrote India's national anthem and became the first non-European Nobel laureate, winning the 1913 Prize in Literature."),
  P('A. P. J. Abdul Kalam', ['kalam', 'apj abdul kalam', 'dr kalam', 'missile man', 'abdul kalam'], 'india', 'm', 1931, 2015, 'Rameswaram, Tamil Nadu', 'scientist president writer', 1, 'Aerospace scientist known as the Missile Man of India who served as the 11th President of India (2002-2007).'),
  P('Sachin Tendulkar', ['sachin', 'tendulkar', 'master blaster', 'little master'], 'india', 'm', 1973, null, 'Mumbai, Maharashtra', 'cricketer athlete', 1, 'Batting legend with 100 international centuries and 200 Test matches, who won the 2011 World Cup with India.'),
  P('MS Dhoni', ['dhoni', 'mahendra singh dhoni', 'ms dhoni', 'mahi', 'captain cool'], 'india', 'm', 1981, null, 'Ranchi, Jharkhand', 'cricketer athlete', 1, 'Wicketkeeper-batter who captained India to the 2007 T20 World Cup and the 2011 ODI World Cup.'),
  P('Virat Kohli', ['kohli', 'king kohli'], 'india', 'm', 1988, null, 'Delhi', 'cricketer athlete', 1, 'Prolific batter and former India captain, known for his chasing ability and aggressive style.'),
  P('Kapil Dev', ['kapil', 'kapil dev nikhanj'], 'india', 'm', 1959, null, 'Chandigarh', 'cricketer athlete', 2, "All-rounder who captained India to its first Cricket World Cup title in 1983."),
  P('Lata Mangeshkar', ['lata', 'lata didi', 'nightingale of india'], 'india', 'f', 1929, 2022, 'Indore, Madhya Pradesh', 'singer musician bollywood', 1, 'Legendary playback singer who recorded songs in many languages over seven decades and received the Bharat Ratna.'),
  P('Amitabh Bachchan', ['bachchan', 'big b', 'amitabh'], 'india', 'm', 1942, null, 'Prayagraj, Uttar Pradesh', 'actor bollywood', 1, 'Iconic Bollywood actor known for films like Sholay and Deewaar and for his deep baritone voice.'),
  P('Shah Rukh Khan', ['srk', 'shahrukh khan', 'shah rukh', 'king khan'], 'india', 'm', 1965, null, 'Delhi', 'actor bollywood', 1, 'Bollywood superstar nicknamed the King of Bollywood, known for Dilwale Dulhania Le Jayenge and many other hits.'),
  P('Indira Gandhi', ['indira', 'indira priyadarshini gandhi'], 'india', 'f', 1917, 1984, 'Prayagraj, Uttar Pradesh', 'politician prime-minister assassinated', 2, "India's first woman Prime Minister; she was assassinated by her bodyguards in 1984."),
  P('C. V. Raman', ['raman', 'cv raman', 'chandrasekhara venkata raman'], 'india', 'm', 1888, 1970, 'Tiruchirappalli, Tamil Nadu', 'scientist physicist nobel-laureate', 2, 'Physicist who discovered the Raman effect in light scattering and won the 1930 Nobel Prize in Physics.'),
  P('Srinivasa Ramanujan', ['ramanujan'], 'india', 'm', 1887, 1920, 'Erode, Tamil Nadu', 'scientist mathematician', 2, 'Self-taught mathematician who made extraordinary contributions to number theory and infinite series.'),
  P('Swami Vivekananda', ['vivekananda', 'narendranath datta', 'narendra nath datta'], 'india', 'm', 1863, 1902, 'Kolkata, West Bengal', 'spiritual-leader', 2, 'Hindu monk who introduced Vedanta and yoga to the West, famous for his 1893 speech in Chicago.'),
  P('Satyajit Ray', ['ray', 'satyajit'], 'india', 'm', 1921, 1992, 'Kolkata, West Bengal', 'filmmaker writer oscar-winner', 2, 'Bengali filmmaker best known for the Apu Trilogy; he received an honorary Academy Award in 1992.'),
  P('Mirza Ghalib', ['ghalib', 'mirza asadullah baig khan'], 'india', 'm', 1797, 1869, 'Agra, Uttar Pradesh', 'poet writer', 2, 'Celebrated Urdu and Persian poet of the late Mughal era, remembered for his ghazals.'),
  P('Akbar', ['akbar the great', 'emperor akbar', 'jalaluddin akbar'], 'india', 'm', 1542, 1605, 'Umerkot, Sindh', 'ruler mughal', 2, 'Third Mughal emperor who expanded the empire, built Fatehpur Sikri and was known for his policy of religious tolerance.'),
  P('Shivaji', ['chhatrapati shivaji', 'shivaji maharaj', 'shivaji bhonsle'], 'india', 'm', 1630, 1680, 'Shivneri, Maharashtra', 'ruler maratha', 2, 'Founder of the Maratha Empire, remembered for guerrilla warfare and a strong navy.'),
  P('Maharana Pratap', ['rana pratap', 'pratap singh'], 'india', 'm', 1540, 1597, 'Kumbhalgarh, Rajasthan', 'ruler rajput', 3, 'Rajput king of Mewar famed for resisting the Mughals at the Battle of Haldighati in 1576.'),
  P('Ashoka', ['ashoka the great', 'emperor ashoka', 'ashok'], 'india', 'm', -304, -232, 'Pataliputra, Bihar', 'ruler buddhist', 2, 'Mauryan emperor who, after the Kalinga war, embraced Buddhism and spread its message across Asia.'),
  P('Tipu Sultan', ['tipu', 'tiger of mysore'], 'india', 'm', 1751, 1799, 'Devanahalli, Karnataka', 'ruler military', 3, 'Ruler of Mysore known as the Tiger of Mysore who resisted the British East India Company; he died defending Srirangapatna in 1799.'),
  P('Kalpana Chawla', ['kalpana'], 'india', 'f', 1962, 2003, 'Karnal, Haryana', 'astronaut scientist', 2, 'First woman of Indian origin in space; she died in the Space Shuttle Columbia disaster in 2003.'),
  P('Sania Mirza', ['sania'], 'india', 'f', 1986, null, 'Mumbai, Maharashtra', 'athlete tennis', 2, 'Tennis star who won several Grand Slam doubles titles and reached world number one in doubles.'),
  P('P. V. Sindhu', ['sindhu', 'pv sindhu', 'pusarla venkata sindhu'], 'india', 'f', 1995, null, 'Hyderabad, Telangana', 'athlete badminton olympic-medalist', 2, 'Badminton champion, 2019 world champion and two-time Olympic medallist (silver in 2016, bronze in 2020).'),
  P('Neeraj Chopra', ['neeraj', 'golden boy'], 'india', 'm', 1997, null, 'Khandra, Haryana', 'athlete javelin olympic-medalist', 2, "Javelin thrower who won India's first Olympic gold in athletics at Tokyo 2020 and silver at Paris 2024."),
  P('Mary Kom', ['mc mary kom', 'mangte chungneijang mary kom'], 'india', 'f', 1983, null, 'Kangathei, Manipur', 'athlete boxing olympic-medalist', 2, 'Boxer who became a six-time world champion and won Olympic bronze in 2012.'),
  P('Dhyan Chand', ['major dhyan chand', 'dhyan chand singh', 'hockey wizard'], 'india', 'm', 1905, 1979, 'Prayagraj, Uttar Pradesh', 'athlete hockey olympic-medalist', 2, 'The Hockey Wizard who led India to Olympic gold in 1928, 1932 and 1936; National Sports Day marks his birthday.'),
  P('A. R. Rahman', ['rahman', 'ar rahman', 'allah rakha rahman'], 'india', 'm', 1967, null, 'Chennai, Tamil Nadu', 'musician singer bollywood oscar-winner', 2, 'Composer who won two Academy Awards for Slumdog Millionaire in 2009.'),
  P('Narendra Modi', ['modi', 'narendra damodardas modi'], 'india', 'm', 1950, null, 'Vadnagar, Gujarat', 'politician prime-minister', 1, 'Prime Minister of India since 2014; earlier he served as Chief Minister of Gujarat.'),
  P('Ratan Tata', ['ratan', 'ratan naval tata'], 'india', 'm', 1937, 2024, 'Mumbai, Maharashtra', 'businessperson philanthropist', 2, 'Industrialist who led the Tata Group and was widely admired for his philanthropy; he passed away in 2024.'),
  P('Kishore Kumar', ['kishore', 'kishore da'], 'india', 'm', 1929, 1987, 'Khandwa, Madhya Pradesh', 'singer musician actor bollywood', 2, 'Versatile playback singer and actor famous for his yodelling and countless Hindi film hits.'),
  P('Mohammed Rafi', ['rafi', 'mohd rafi', 'mohammad rafi'], 'india', 'm', 1924, 1980, 'Kotla Sultan Singh, Punjab', 'singer musician bollywood', 2, "One of Bollywood's greatest playback singers, celebrated for his versatility and romantic songs."),
  P('Raj Kapoor', ['showman', 'raj kapur'], 'india', 'm', 1924, 1988, 'Peshawar, Khyber Pakhtunkhwa', 'actor filmmaker bollywood', 3, 'Actor and director called the Showman of Bollywood; born in Peshawar, he made films like Awaara and Shree 420.'),
  // ---- Pakistan
  P('Muhammad Ali Jinnah', ['jinnah', 'quaid-e-azam', 'quaid e azam', 'mohammad ali jinnah', 'quaid'], 'pakistan', 'm', 1876, 1948, 'Karachi, Sindh', 'politician lawyer', 1, 'Founder of Pakistan and its first Governor-General, known as Quaid-e-Azam, the Great Leader.'),
  P('Allama Iqbal', ['iqbal', 'muhammad iqbal', 'allama muhammad iqbal', 'poet of the east'], 'pakistan', 'm', 1877, 1938, 'Sialkot, Punjab', 'poet writer politician lawyer', 1, "Poet-philosopher whose ideas inspired the demand for a separate homeland for South Asian Muslims; Pakistan's national poet."),
  P('Liaquat Ali Khan', ['liaquat', 'liaquat ali'], 'pakistan', 'm', 1895, 1951, 'Karnal, Haryana', 'politician prime-minister lawyer assassinated', 3, 'First Prime Minister of Pakistan; he was assassinated in Rawalpindi in 1951.'),
  P('Imran Khan', ['imran', 'imran khan niazi'], 'pakistan', 'm', 1952, null, 'Lahore, Punjab', 'cricketer athlete politician prime-minister philanthropist', 1, 'Captained Pakistan to the 1992 Cricket World Cup, founded the Shaukat Khanum cancer hospital and served as Prime Minister from 2018 to 2022.'),
  P('Wasim Akram', ['wasim', 'sultan of swing'], 'pakistan', 'm', 1966, null, 'Lahore, Punjab', 'cricketer athlete', 2, "Left-arm fast bowler called the Sultan of Swing; part of Pakistan's 1992 World Cup-winning side."),
  P('Shahid Afridi', ['afridi', 'boom boom', 'lala'], 'pakistan', 'm', 1980, null, 'Khyber, Khyber Pakhtunkhwa', 'cricketer athlete', 2, 'Explosive all-rounder nicknamed Boom Boom who captained Pakistan in limited-overs cricket.'),
  P('Babar Azam', ['babar'], 'pakistan', 'm', 1994, null, 'Lahore, Punjab', 'cricketer athlete', 2, 'Elegant Pakistani batter who has captained the national side across formats.'),
  P('Javed Miandad', ['miandad'], 'pakistan', 'm', 1957, null, 'Karachi, Sindh', 'cricketer athlete', 3, 'Pakistani batting great famous for his last-ball six against India at Sharjah in 1986.'),
  P('Waqar Younis', ['waqar'], 'pakistan', 'm', 1971, null, 'Burewala, Punjab', 'cricketer athlete', 2, 'Fast bowler famous for deadly reverse-swinging yorkers; he formed a feared pair with Wasim Akram.'),
  P('Jahangir Khan', ['jahangir'], 'pakistan', 'm', 1963, null, 'Karachi, Sindh', 'athlete squash', 3, 'Squash legend who stayed unbeaten for over five years in the 1980s.'),
  P('Abdus Salam', ['salam', 'dr abdus salam'], 'pakistan', 'm', 1926, 1996, 'Jhang, Punjab', 'scientist physicist nobel-laureate', 2, 'Theoretical physicist who shared the 1979 Nobel Prize in Physics; the first Pakistani Nobel laureate.'),
  P('Malala Yousafzai', ['malala'], 'pakistan', 'f', 1997, null, 'Mingora, Khyber Pakhtunkhwa', 'activist nobel-laureate', 1, 'Education activist who survived a 2012 Taliban attack and became the youngest Nobel Peace Prize laureate in 2014.'),
  P('Nusrat Fateh Ali Khan', ['nusrat', 'nfak', 'shahenshah-e-qawwali'], 'pakistan', 'm', 1948, 1997, 'Faisalabad, Punjab', 'singer musician qawwali', 2, 'Qawwali maestro whose powerful voice brought Sufi music to audiences around the world.'),
  P('Abdul Sattar Edhi', ['edhi', 'sattar edhi', 'angel of mercy'], 'pakistan', 'm', 1928, 2016, 'Bantva, Gujarat', 'philanthropist', 2, 'Humanitarian who founded the Edhi Foundation, running ambulances and shelters across Pakistan.'),
  P('Benazir Bhutto', ['benazir'], 'pakistan', 'f', 1953, 2007, 'Karachi, Sindh', 'politician prime-minister assassinated', 2, 'First woman to lead a Muslim-majority country as Prime Minister; she was assassinated in Rawalpindi in 2007.'),
  P('Zulfikar Ali Bhutto', ['zulfikar bhutto', 'zab', 'z a bhutto'], 'pakistan', 'm', 1928, 1979, 'Larkana, Sindh', 'politician prime-minister president lawyer executed', 3, 'Founder of the Pakistan Peoples Party who served as President and Prime Minister; he was executed in 1979.'),
  P('Fatima Jinnah', ['madar-e-millat', 'madar e millat', 'mohtarma fatima jinnah'], 'pakistan', 'f', 1893, 1967, 'Karachi, Sindh', 'politician', 3, 'Sister of Muhammad Ali Jinnah, called the Mother of the Nation, who ran for President in 1965.'),
  P('Faiz Ahmed Faiz', ['faiz'], 'pakistan', 'm', 1911, 1984, 'Sialkot, Punjab', 'poet writer', 3, 'Revolutionary Urdu poet whose verses of love and resistance made him one of the most loved voices in South Asia.'),
  P('A. Q. Khan', ['aq khan', 'abdul qadeer khan', 'dr khan'], 'pakistan', 'm', 1936, 2021, 'Bhopal, Madhya Pradesh', 'scientist', 3, "Metallurgist who played a central role in Pakistan's nuclear weapons programme; born in Bhopal, India."),
  P('Pervez Musharraf', ['musharraf'], 'pakistan', 'm', 1943, 2023, 'Delhi', 'politician president military', 3, "Army general who took power in 1999 and served as Pakistan's President from 2001 to 2008."),
  P('Noor Jehan', ['noor jahan', 'noorjehan', 'malika-e-tarannum', 'malika e tarannum'], 'pakistan', 'f', 1926, 2000, 'Kasur, Punjab', 'singer musician actor', 3, 'Singer and actress called Malika-e-Tarannum (Queen of Melody), a legend of film music.'),
  P('Arshad Nadeem', ['nadeem', 'arshad'], 'pakistan', 'm', 1997, null, 'Mian Channu, Punjab', 'athlete javelin olympic-medalist', 2, "Javelin thrower who won Pakistan's first individual Olympic gold at Paris 2024 with an Olympic-record throw."),
];

const PLACES = [
  // ---- India
  L('Taj Mahal', ['taj', 'tajmahal'], 'india', 1653, 'Agra, Uttar Pradesh', 'tomb monument building man-made unesco mughal medieval shah-jahan marble', 1, 'Ivory-white marble mausoleum built by Shah Jahan for his wife Mumtaz Mahal on the bank of the Yamuna River.'),
  L('Red Fort', ['lal qila', 'lal quila', 'red fort delhi'], 'india', 1648, 'Delhi', 'fort building man-made unesco mughal medieval shah-jahan', 1, 'Mughal fort in Old Delhi from which the Prime Minister hoists the national flag on Independence Day.'),
  L('Qutub Minar', ['qutb minar', 'qutab minar'], 'india', 1220, 'Delhi', 'tower monument building man-made unesco medieval', 2, 'A 73-metre brick minaret begun by Qutb ud-Din Aibak in 1192 and completed by Iltutmish around 1220.'),
  L('India Gate', [], 'india', 1931, 'Delhi', 'memorial monument building man-made colonial british', 1, 'War memorial honouring soldiers who died in World War I and the Afghan wars, designed by Edwin Lutyens.'),
  L('Gateway of India', [], 'india', 1924, 'Mumbai, Maharashtra', 'monument building man-made colonial british', 1, "Basalt arch on Mumbai harbour, completed in 1924 to commemorate King George V's visit."),
  L('Amber Fort', ['amer fort', 'amer palace', 'amber palace'], 'india', 1592, 'Jaipur, Rajasthan', 'fort palace building man-made unesco rajput medieval', 2, 'Hilltop Rajput fort-palace near Jaipur, begun by Raja Man Singh I in 1592.'),
  L('Golden Temple', ['harmandir sahib', 'darbar sahib', 'sri harmandir sahib'], 'india', 1604, 'Amritsar, Punjab', 'gurdwara building man-made religious sikh medieval', 1, 'Holiest gurdwara of Sikhism, with a gold-plated sanctum in a sacred pool; Guru Arjan installed the Guru Granth Sahib here in 1604.'),
  L('Konark Sun Temple', ['konark', 'konark temple', 'sun temple'], 'india', 1250, 'Konark, Odisha', 'temple building man-made unesco religious hindu medieval', 2, 'A 13th-century temple shaped like a giant chariot of the Sun god, with 24 carved stone wheels.'),
  L('Khajuraho Temples', ['khajuraho', 'khajuraho group of monuments'], 'india', 1000, 'Khajuraho, Madhya Pradesh', 'temple building man-made unesco religious hindu medieval', 2, 'Group of medieval Hindu and Jain temples famous for intricate sculptures, built under the Chandela dynasty.'),
  L('Ajanta Caves', ['ajanta'], 'india', -150, 'Aurangabad, Maharashtra', 'cave man-made unesco religious buddhist ancient', 2, 'Rock-cut Buddhist cave monasteries with ancient paintings, made between about the 2nd century BCE and the 5th century CE.'),
  L('Ellora Caves', ['ellora'], 'india', 700, 'Aurangabad, Maharashtra', 'cave man-made unesco religious buddhist hindu medieval', 2, 'Rock-cut caves with Buddhist, Hindu and Jain monuments, including the huge Kailasa temple carved from one rock.'),
  L('Sanchi Stupa', ['sanchi', 'great stupa'], 'india', -250, 'Sanchi, Madhya Pradesh', 'stupa monument man-made unesco religious buddhist ancient', 2, 'Ancient Buddhist stupa first commissioned by Emperor Ashoka in the 3rd century BCE.'),
  L('Mysore Palace', ['mysuru palace', 'amba vilas palace'], 'india', 1912, 'Mysuru, Karnataka', 'palace building man-made colonial', 2, 'Opulent Indo-Saracenic palace of the Wadiyar kings, famously lit by thousands of bulbs during Dasara.'),
  L('Meenakshi Temple', ['meenakshi amman temple', 'meenakshi', 'madurai meenakshi temple'], 'india', 1600, 'Madurai, Tamil Nadu', 'temple building man-made religious hindu medieval', 2, 'Historic Hindu temple known for towering gopurams covered in colourful sculptures; its present form dates mainly to the 17th century.'),
  L('Hampi', ['vijayanagara', 'group of monuments at hampi'], 'india', 1336, 'Hampi, Karnataka', 'ruins man-made unesco medieval', 2, "Ruins of the Vijayanagara Empire's capital, strewn with temples and boulders along the Tungabhadra River."),
  L('Charminar', [], 'india', 1591, 'Hyderabad, Telangana', 'monument mosque tower building man-made medieval', 2, 'Four-minaret monument built in 1591 by Muhammad Quli Qutb Shah in the heart of Hyderabad.'),
  L('Lotus Temple', ['bahai temple', 'bahai house of worship'], 'india', 1986, 'Delhi', 'temple building man-made religious modern', 2, 'Flower-shaped Baha\'i House of Worship completed in 1986 and open to people of all faiths.'),
  L('Victoria Memorial', [], 'india', 1921, 'Kolkata, West Bengal', 'memorial monument museum building man-made colonial british marble', 2, 'White marble memorial and museum built in memory of Queen Victoria and opened in 1921.'),
  L('Howrah Bridge', ['rabindra setu'], 'india', 1943, 'Kolkata, West Bengal', 'bridge man-made colonial british', 2, 'Cantilever bridge over the Hooghly River, one of the busiest in the world, opened in 1943.'),
  L('Fatehpur Sikri', [], 'india', 1585, 'Fatehpur Sikri, Uttar Pradesh', 'city ruins man-made unesco mughal medieval akbar', 2, 'Red sandstone capital built by Emperor Akbar and abandoned after about fourteen years.'),
  L('Jama Masjid, Delhi', ['jama masjid', 'jama masjid delhi'], 'india', 1656, 'Delhi', 'mosque building man-made religious islamic mughal medieval shah-jahan', 2, "One of India's largest mosques, built by Shah Jahan, with a courtyard that holds tens of thousands."),
  L("Humayun's Tomb", ['humayuns tomb', 'humayun tomb'], 'india', 1570, 'Delhi', 'tomb monument building man-made unesco mughal medieval', 2, 'Garden tomb of the second Mughal emperor, a forerunner of the Taj Mahal.'),
  L('Varanasi', ['banaras', 'benares', 'kashi'], 'india', null, 'Varanasi, Uttar Pradesh', 'city religious hindu ancient', 2, 'One of the oldest continuously inhabited cities, sacred on the banks of the Ganges and famed for its ghats.'),
  L('Kanchenjunga', ['kangchenjunga', 'mount kanchenjunga'], 'india', null, 'Sikkim', 'mountain natural unesco', 2, "World's third-highest mountain at 8,586 m, on the Sikkim-Nepal border; Khangchendzonga National Park is a UNESCO site."),
  L('Dal Lake', [], 'india', null, 'Srinagar, Jammu and Kashmir', 'lake natural', 2, 'Famous lake in Srinagar known for houseboats and shikara rides.'),
  L('Sundarbans', ['sundarban', 'sundarbans national park'], 'india', null, 'West Bengal', 'forest natural unesco', 3, 'Vast mangrove forest delta shared with Bangladesh and home of the Bengal tiger; the Indian part is a UNESCO site.'),
  L('Marina Beach', [], 'india', null, 'Chennai, Tamil Nadu', 'beach natural', 3, 'One of the longest urban beaches in the world, along the Bay of Bengal in Chennai.'),
  L('Statue of Unity', [], 'india', 2018, 'Kevadia, Gujarat', 'statue monument man-made modern', 1, "World's tallest statue at 182 metres, honouring Sardar Vallabhbhai Patel beside the Narmada River."),
  L('Mumbai', ['bombay'], 'india', null, 'Mumbai, Maharashtra', 'city', 1, "India's financial capital and the home of Bollywood."),
  L('Delhi', ['new delhi'], 'india', null, 'Delhi', 'city capital', 1, "India's capital territory, home to Parliament, Rashtrapati Bhavan and many Mughal monuments."),
  L('Jaipur', ['pink city'], 'india', 1727, 'Jaipur, Rajasthan', 'city unesco rajput medieval', 2, 'The Pink City, founded in 1727 by Sawai Jai Singh II and a UNESCO World Heritage city.'),
  L('Mehrangarh Fort', ['mehrangarh', 'jodhpur fort'], 'india', 1459, 'Jodhpur, Rajasthan', 'fort building man-made rajput medieval', 3, 'Massive fort towering over the blue city of Jodhpur, founded by Rao Jodha in 1459.'),
  // ---- Pakistan
  L('Badshahi Mosque', ['badshahi masjid', 'royal mosque'], 'pakistan', 1673, 'Lahore, Punjab', 'mosque building man-made religious islamic mughal medieval aurangzeb', 1, 'Grand Mughal mosque built by Emperor Aurangzeb in 1673, once the largest mosque in the world.'),
  L('Lahore Fort', ['shahi qila', 'lahore qila'], 'pakistan', 1566, 'Lahore, Punjab', 'fort building man-made unesco mughal medieval', 2, 'Citadel in Lahore reshaped by successive Mughal rulers and UNESCO-listed together with the Shalimar Gardens.'),
  L('Shalimar Gardens', ['shalimar bagh', 'shalamar gardens'], 'pakistan', 1642, 'Lahore, Punjab', 'garden man-made unesco mughal medieval shah-jahan', 2, 'Terraced Mughal garden laid out for Emperor Shah Jahan in 1641-42.'),
  L('Faisal Mosque', ['faisal masjid'], 'pakistan', 1986, 'Islamabad', 'mosque building man-made religious islamic modern', 1, 'Tent-shaped mosque at the foot of the Margalla Hills, completed in 1986 and named after King Faisal of Saudi Arabia.'),
  L('Minar-e-Pakistan', ['minar e pakistan'], 'pakistan', 1968, 'Lahore, Punjab', 'tower monument building man-made modern', 1, 'Tower in Lahore marking the 1940 Lahore Resolution that called for a separate homeland; completed in 1968.'),
  L('Mohenjo-daro', ['mohenjo daro', 'mohenjodaro'], 'pakistan', -2500, 'Larkana, Sindh', 'ruins city man-made unesco ancient', 1, 'Ancient Indus Valley Civilisation city from about 2500 BCE, known for its planned streets and drains.'),
  L('Harappa', [], 'pakistan', -2600, 'Sahiwal, Punjab', 'ruins city man-made ancient', 2, 'Major Indus Valley Civilisation city (about 2600 BCE) that gave the civilisation its other name, the Harappan culture.'),
  L('Taxila', [], 'pakistan', -500, 'Rawalpindi, Punjab', 'ruins city man-made unesco ancient buddhist', 3, 'Ancient Gandhara city and renowned centre of learning with Buddhist monasteries.'),
  L('Rohtas Fort', ['rohtas', 'qila rohtas'], 'pakistan', 1548, 'Jhelum, Punjab', 'fort building man-made unesco medieval', 3, 'Massive fort built by Sher Shah Suri between 1541 and 1548.'),
  L('Makli Necropolis', ['makli', 'makli graveyard'], 'pakistan', 1400, 'Thatta, Sindh', 'tomb man-made unesco medieval', 3, "One of the world's largest necropolises, with tombs spanning the 14th to 18th centuries."),
  L('Quaid-e-Azam Mausoleum', ['jinnah mausoleum', 'mazar-e-quaid', 'mazar e quaid', 'quaid mazar'], 'pakistan', 1970, 'Karachi, Sindh', 'tomb monument building man-made modern marble', 1, 'White marble mausoleum of Muhammad Ali Jinnah in Karachi, completed in 1970.'),
  L('K2', ['mount godwin-austen', 'godwin austen', 'chogori'], 'pakistan', null, 'Gilgit-Baltistan', 'mountain natural', 1, 'Second-highest mountain on Earth at 8,611 m, in the Karakoram on the Pakistan-China border; known as the Savage Mountain.'),
  L('Nanga Parbat', [], 'pakistan', null, 'Gilgit-Baltistan', 'mountain natural', 2, 'Ninth-highest mountain on Earth at 8,126 m, nicknamed Killer Mountain.'),
  L('Hunza Valley', ['hunza', 'karimabad'], 'pakistan', null, 'Hunza, Gilgit-Baltistan', 'valley natural', 2, 'Scenic mountain valley in the Karakoram known for apricots, old forts and views of Rakaposhi.'),
  L('Swat Valley', ['swat'], 'pakistan', null, 'Swat, Khyber Pakhtunkhwa', 'valley natural', 3, 'Green valley nicknamed the Switzerland of the East, with rivers, forests and Buddhist heritage.'),
  L('Khyber Pass', [], 'pakistan', null, 'Khyber, Khyber Pakhtunkhwa', 'pass natural', 3, 'Historic mountain pass linking Pakistan and Afghanistan, used by traders and armies for centuries.'),
  L('Attabad Lake', ['attabad', 'gojal lake'], 'pakistan', 2010, 'Hunza, Gilgit-Baltistan', 'lake natural', 3, 'Turquoise lake formed in 2010 when a landslide dammed the Hunza River.'),
  L('Derawar Fort', ['qila derawar', 'derawar'], 'pakistan', 1732, 'Bahawalpur, Punjab', 'fort building man-made medieval', 3, 'Forty-bastion fort rising from the Cholistan Desert; origins go back to the 9th century and it was rebuilt in 1732.'),
  L('Karachi', [], 'pakistan', null, 'Karachi, Sindh', 'city', 1, "Pakistan's largest city and main seaport, on the Arabian Sea."),
  L('Lahore', [], 'pakistan', null, 'Lahore, Punjab', 'city', 1, "Cultural heart of Pakistan and capital of Punjab province, famed for its Mughal monuments and food."),
  L('Islamabad', [], 'pakistan', 1960, 'Islamabad', 'city capital modern', 1, "Pakistan's purpose-built capital, planned in the 1960s at the foot of the Margalla Hills."),
];

/** Regions (states, provinces, big cities) that no record may use, so "Is it in Kerala?" gets a firm "No". */
const EXTRA_REGIONS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
  'Mumbai', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow', 'Agra', 'Varanasi', 'Amritsar', 'Bhopal', 'Patna', 'Indore', 'Nagpur', 'Kanpur', 'Surat', 'Mysuru', 'Prayagraj',
  'Sindh', 'Balochistan', 'Khyber Pakhtunkhwa', 'Gilgit-Baltistan', 'Islamabad', 'Azad Kashmir',
  'Karachi', 'Lahore', 'Rawalpindi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Sialkot', 'Gujranwala', 'Bahawalpur',
];

module.exports = { PEOPLE, PLACES, EXTRA_REGIONS };
