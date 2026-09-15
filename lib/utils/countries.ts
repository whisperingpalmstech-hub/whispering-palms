/**
 * ISO 3166-1 country data.
 *
 * `code` is the alpha-2 code and is what gets persisted to `users.country`.
 * Display names are resolved at render time, so the stored value never has to
 * change when a country is renamed or the UI is translated.
 *
 * Generated from the ISO 3166-1 list; `timezone` is a representative IANA zone
 * for the country, used to pre-fill a birth timezone. Countries spanning several
 * zones get their most populous one - treat it as a default, not a fact.
 */

export interface Country {
  /** ISO 3166-1 alpha-2, e.g. "IN". The value stored in the database. */
  code: string
  /** English short name. */
  name: string
  /** E.164 calling code without the leading "+". */
  dialCode: string
  /** Representative IANA timezone. */
  timezone: string
}

export const COUNTRIES: readonly Country[] = [
  { code: 'AF', name: 'Afghanistan', dialCode: '93', timezone: 'Asia/Kabul' },
  { code: 'AL', name: 'Albania', dialCode: '355', timezone: 'Europe/Tirane' },
  { code: 'DZ', name: 'Algeria', dialCode: '213', timezone: 'Africa/Algiers' },
  { code: 'AS', name: 'American Samoa', dialCode: '1684', timezone: 'Pacific/Pago_Pago' },
  { code: 'AD', name: 'Andorra', dialCode: '376', timezone: 'Europe/Andorra' },
  { code: 'AO', name: 'Angola', dialCode: '244', timezone: 'Africa/Luanda' },
  { code: 'AI', name: 'Anguilla', dialCode: '1264', timezone: 'America/Anguilla' },
  { code: 'AQ', name: 'Antarctica', dialCode: '672', timezone: 'Antarctica/McMurdo' },
  { code: 'AG', name: 'Antigua and Barbuda', dialCode: '1268', timezone: 'America/Antigua' },
  { code: 'AR', name: 'Argentina', dialCode: '54', timezone: 'America/Argentina/Buenos_Aires' },
  { code: 'AM', name: 'Armenia', dialCode: '374', timezone: 'Asia/Yerevan' },
  { code: 'AW', name: 'Aruba', dialCode: '297', timezone: 'America/Aruba' },
  { code: 'AU', name: 'Australia', dialCode: '61', timezone: 'Australia/Sydney' },
  { code: 'AT', name: 'Austria', dialCode: '43', timezone: 'Europe/Vienna' },
  { code: 'AZ', name: 'Azerbaijan', dialCode: '994', timezone: 'Asia/Baku' },
  { code: 'BS', name: 'Bahamas', dialCode: '1242', timezone: 'America/Nassau' },
  { code: 'BH', name: 'Bahrain', dialCode: '973', timezone: 'Asia/Bahrain' },
  { code: 'BD', name: 'Bangladesh', dialCode: '880', timezone: 'Asia/Dhaka' },
  { code: 'BB', name: 'Barbados', dialCode: '1246', timezone: 'America/Barbados' },
  { code: 'BY', name: 'Belarus', dialCode: '375', timezone: 'Europe/Minsk' },
  { code: 'BE', name: 'Belgium', dialCode: '32', timezone: 'Europe/Brussels' },
  { code: 'BZ', name: 'Belize', dialCode: '501', timezone: 'America/Belize' },
  { code: 'BJ', name: 'Benin', dialCode: '229', timezone: 'Africa/Porto-Novo' },
  { code: 'BM', name: 'Bermuda', dialCode: '1441', timezone: 'Atlantic/Bermuda' },
  { code: 'BT', name: 'Bhutan', dialCode: '975', timezone: 'Asia/Thimphu' },
  { code: 'BO', name: 'Bolivia', dialCode: '591', timezone: 'America/La_Paz' },
  { code: 'BQ', name: 'Bonaire, Sint Eustatius and Saba', dialCode: '599', timezone: 'America/Kralendijk' },
  { code: 'BA', name: 'Bosnia and Herzegovina', dialCode: '387', timezone: 'Europe/Sarajevo' },
  { code: 'BW', name: 'Botswana', dialCode: '267', timezone: 'Africa/Gaborone' },
  { code: 'BV', name: 'Bouvet Island', dialCode: '47', timezone: 'Europe/Oslo' },
  { code: 'BR', name: 'Brazil', dialCode: '55', timezone: 'America/Sao_Paulo' },
  { code: 'IO', name: 'British Indian Ocean Territory', dialCode: '246', timezone: 'Indian/Chagos' },
  { code: 'BN', name: 'Brunei Darussalam', dialCode: '673', timezone: 'Asia/Brunei' },
  { code: 'BG', name: 'Bulgaria', dialCode: '359', timezone: 'Europe/Sofia' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '226', timezone: 'Africa/Ouagadougou' },
  { code: 'BI', name: 'Burundi', dialCode: '257', timezone: 'Africa/Bujumbura' },
  { code: 'CV', name: 'Cabo Verde', dialCode: '238', timezone: 'Atlantic/Cape_Verde' },
  { code: 'KH', name: 'Cambodia', dialCode: '855', timezone: 'Asia/Phnom_Penh' },
  { code: 'CM', name: 'Cameroon', dialCode: '237', timezone: 'Africa/Douala' },
  { code: 'CA', name: 'Canada', dialCode: '1', timezone: 'America/Toronto' },
  { code: 'KY', name: 'Cayman Islands', dialCode: '1345', timezone: 'America/Cayman' },
  { code: 'CF', name: 'Central African Republic', dialCode: '236', timezone: 'Africa/Bangui' },
  { code: 'TD', name: 'Chad', dialCode: '235', timezone: 'Africa/Ndjamena' },
  { code: 'CL', name: 'Chile', dialCode: '56', timezone: 'America/Santiago' },
  { code: 'CN', name: 'China', dialCode: '86', timezone: 'Asia/Shanghai' },
  { code: 'CX', name: 'Christmas Island', dialCode: '61', timezone: 'Indian/Christmas' },
  { code: 'CC', name: 'Cocos (Keeling) Islands', dialCode: '61', timezone: 'Indian/Cocos' },
  { code: 'CO', name: 'Colombia', dialCode: '57', timezone: 'America/Bogota' },
  { code: 'KM', name: 'Comoros', dialCode: '269', timezone: 'Indian/Comoro' },
  { code: 'CG', name: 'Congo', dialCode: '242', timezone: 'Africa/Brazzaville' },
  { code: 'CD', name: 'Congo, Democratic Republic of the', dialCode: '243', timezone: 'Africa/Kinshasa' },
  { code: 'CK', name: 'Cook Islands', dialCode: '682', timezone: 'Pacific/Rarotonga' },
  { code: 'CR', name: 'Costa Rica', dialCode: '506', timezone: 'America/Costa_Rica' },
  { code: 'HR', name: 'Croatia', dialCode: '385', timezone: 'Europe/Zagreb' },
  { code: 'CU', name: 'Cuba', dialCode: '53', timezone: 'America/Havana' },
  { code: 'CW', name: 'Curaçao', dialCode: '599', timezone: 'America/Curacao' },
  { code: 'CY', name: 'Cyprus', dialCode: '357', timezone: 'Asia/Nicosia' },
  { code: 'CZ', name: 'Czechia', dialCode: '420', timezone: 'Europe/Prague' },
  { code: 'CI', name: 'Côte d\'Ivoire', dialCode: '225', timezone: 'Africa/Abidjan' },
  { code: 'DK', name: 'Denmark', dialCode: '45', timezone: 'Europe/Copenhagen' },
  { code: 'DJ', name: 'Djibouti', dialCode: '253', timezone: 'Africa/Djibouti' },
  { code: 'DM', name: 'Dominica', dialCode: '1767', timezone: 'America/Dominica' },
  { code: 'DO', name: 'Dominican Republic', dialCode: '1809', timezone: 'America/Santo_Domingo' },
  { code: 'EC', name: 'Ecuador', dialCode: '593', timezone: 'America/Guayaquil' },
  { code: 'EG', name: 'Egypt', dialCode: '20', timezone: 'Africa/Cairo' },
  { code: 'SV', name: 'El Salvador', dialCode: '503', timezone: 'America/El_Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea', dialCode: '240', timezone: 'Africa/Malabo' },
  { code: 'ER', name: 'Eritrea', dialCode: '291', timezone: 'Africa/Asmara' },
  { code: 'EE', name: 'Estonia', dialCode: '372', timezone: 'Europe/Tallinn' },
  { code: 'SZ', name: 'Eswatini', dialCode: '268', timezone: 'Africa/Mbabane' },
  { code: 'ET', name: 'Ethiopia', dialCode: '251', timezone: 'Africa/Addis_Ababa' },
  { code: 'FK', name: 'Falkland Islands', dialCode: '500', timezone: 'Atlantic/Stanley' },
  { code: 'FO', name: 'Faroe Islands', dialCode: '298', timezone: 'Atlantic/Faroe' },
  { code: 'FJ', name: 'Fiji', dialCode: '679', timezone: 'Pacific/Fiji' },
  { code: 'FI', name: 'Finland', dialCode: '358', timezone: 'Europe/Helsinki' },
  { code: 'FR', name: 'France', dialCode: '33', timezone: 'Europe/Paris' },
  { code: 'GF', name: 'French Guiana', dialCode: '594', timezone: 'America/Cayenne' },
  { code: 'PF', name: 'French Polynesia', dialCode: '689', timezone: 'Pacific/Tahiti' },
  { code: 'TF', name: 'French Southern Territories', dialCode: '262', timezone: 'Indian/Kerguelen' },
  { code: 'GA', name: 'Gabon', dialCode: '241', timezone: 'Africa/Libreville' },
  { code: 'GM', name: 'Gambia', dialCode: '220', timezone: 'Africa/Banjul' },
  { code: 'GE', name: 'Georgia', dialCode: '995', timezone: 'Asia/Tbilisi' },
  { code: 'DE', name: 'Germany', dialCode: '49', timezone: 'Europe/Berlin' },
  { code: 'GH', name: 'Ghana', dialCode: '233', timezone: 'Africa/Accra' },
  { code: 'GI', name: 'Gibraltar', dialCode: '350', timezone: 'Europe/Gibraltar' },
  { code: 'GR', name: 'Greece', dialCode: '30', timezone: 'Europe/Athens' },
  { code: 'GL', name: 'Greenland', dialCode: '299', timezone: 'America/Nuuk' },
  { code: 'GD', name: 'Grenada', dialCode: '1473', timezone: 'America/Grenada' },
  { code: 'GP', name: 'Guadeloupe', dialCode: '590', timezone: 'America/Guadeloupe' },
  { code: 'GU', name: 'Guam', dialCode: '1671', timezone: 'Pacific/Guam' },
  { code: 'GT', name: 'Guatemala', dialCode: '502', timezone: 'America/Guatemala' },
  { code: 'GG', name: 'Guernsey', dialCode: '44', timezone: 'Europe/Guernsey' },
  { code: 'GN', name: 'Guinea', dialCode: '224', timezone: 'Africa/Conakry' },
  { code: 'GW', name: 'Guinea-Bissau', dialCode: '245', timezone: 'Africa/Bissau' },
  { code: 'GY', name: 'Guyana', dialCode: '592', timezone: 'America/Guyana' },
  { code: 'HT', name: 'Haiti', dialCode: '509', timezone: 'America/Port-au-Prince' },
  { code: 'HM', name: 'Heard Island and McDonald Islands', dialCode: '672', timezone: 'Indian/Kerguelen' },
  { code: 'VA', name: 'Holy See', dialCode: '379', timezone: 'Europe/Vatican' },
  { code: 'HN', name: 'Honduras', dialCode: '504', timezone: 'America/Tegucigalpa' },
  { code: 'HK', name: 'Hong Kong', dialCode: '852', timezone: 'Asia/Hong_Kong' },
  { code: 'HU', name: 'Hungary', dialCode: '36', timezone: 'Europe/Budapest' },
  { code: 'IS', name: 'Iceland', dialCode: '354', timezone: 'Atlantic/Reykjavik' },
  { code: 'IN', name: 'India', dialCode: '91', timezone: 'Asia/Kolkata' },
  { code: 'ID', name: 'Indonesia', dialCode: '62', timezone: 'Asia/Jakarta' },
  { code: 'IR', name: 'Iran', dialCode: '98', timezone: 'Asia/Tehran' },
  { code: 'IQ', name: 'Iraq', dialCode: '964', timezone: 'Asia/Baghdad' },
  { code: 'IE', name: 'Ireland', dialCode: '353', timezone: 'Europe/Dublin' },
  { code: 'IM', name: 'Isle of Man', dialCode: '44', timezone: 'Europe/Isle_of_Man' },
  { code: 'IL', name: 'Israel', dialCode: '972', timezone: 'Asia/Jerusalem' },
  { code: 'IT', name: 'Italy', dialCode: '39', timezone: 'Europe/Rome' },
  { code: 'JM', name: 'Jamaica', dialCode: '1876', timezone: 'America/Jamaica' },
  { code: 'JP', name: 'Japan', dialCode: '81', timezone: 'Asia/Tokyo' },
  { code: 'JE', name: 'Jersey', dialCode: '44', timezone: 'Europe/Jersey' },
  { code: 'JO', name: 'Jordan', dialCode: '962', timezone: 'Asia/Amman' },
  { code: 'KZ', name: 'Kazakhstan', dialCode: '7', timezone: 'Asia/Almaty' },
  { code: 'KE', name: 'Kenya', dialCode: '254', timezone: 'Africa/Nairobi' },
  { code: 'KI', name: 'Kiribati', dialCode: '686', timezone: 'Pacific/Tarawa' },
  { code: 'KP', name: 'Korea, Democratic People\'s Republic of', dialCode: '850', timezone: 'Asia/Pyongyang' },
  { code: 'KW', name: 'Kuwait', dialCode: '965', timezone: 'Asia/Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan', dialCode: '996', timezone: 'Asia/Bishkek' },
  { code: 'LA', name: 'Laos', dialCode: '856', timezone: 'Asia/Vientiane' },
  { code: 'LV', name: 'Latvia', dialCode: '371', timezone: 'Europe/Riga' },
  { code: 'LB', name: 'Lebanon', dialCode: '961', timezone: 'Asia/Beirut' },
  { code: 'LS', name: 'Lesotho', dialCode: '266', timezone: 'Africa/Maseru' },
  { code: 'LR', name: 'Liberia', dialCode: '231', timezone: 'Africa/Monrovia' },
  { code: 'LY', name: 'Libya', dialCode: '218', timezone: 'Africa/Tripoli' },
  { code: 'LI', name: 'Liechtenstein', dialCode: '423', timezone: 'Europe/Vaduz' },
  { code: 'LT', name: 'Lithuania', dialCode: '370', timezone: 'Europe/Vilnius' },
  { code: 'LU', name: 'Luxembourg', dialCode: '352', timezone: 'Europe/Luxembourg' },
  { code: 'MO', name: 'Macao', dialCode: '853', timezone: 'Asia/Macau' },
  { code: 'MG', name: 'Madagascar', dialCode: '261', timezone: 'Indian/Antananarivo' },
  { code: 'MW', name: 'Malawi', dialCode: '265', timezone: 'Africa/Blantyre' },
  { code: 'MY', name: 'Malaysia', dialCode: '60', timezone: 'Asia/Kuala_Lumpur' },
  { code: 'MV', name: 'Maldives', dialCode: '960', timezone: 'Indian/Maldives' },
  { code: 'ML', name: 'Mali', dialCode: '223', timezone: 'Africa/Bamako' },
  { code: 'MT', name: 'Malta', dialCode: '356', timezone: 'Europe/Malta' },
  { code: 'MH', name: 'Marshall Islands', dialCode: '692', timezone: 'Pacific/Majuro' },
  { code: 'MQ', name: 'Martinique', dialCode: '596', timezone: 'America/Martinique' },
  { code: 'MR', name: 'Mauritania', dialCode: '222', timezone: 'Africa/Nouakchott' },
  { code: 'MU', name: 'Mauritius', dialCode: '230', timezone: 'Indian/Mauritius' },
  { code: 'YT', name: 'Mayotte', dialCode: '262', timezone: 'Indian/Mayotte' },
  { code: 'MX', name: 'Mexico', dialCode: '52', timezone: 'America/Mexico_City' },
  { code: 'FM', name: 'Micronesia', dialCode: '691', timezone: 'Pacific/Chuuk' },
  { code: 'MD', name: 'Moldova', dialCode: '373', timezone: 'Europe/Chisinau' },
  { code: 'MC', name: 'Monaco', dialCode: '377', timezone: 'Europe/Monaco' },
  { code: 'MN', name: 'Mongolia', dialCode: '976', timezone: 'Asia/Ulaanbaatar' },
  { code: 'ME', name: 'Montenegro', dialCode: '382', timezone: 'Europe/Podgorica' },
  { code: 'MS', name: 'Montserrat', dialCode: '1664', timezone: 'America/Montserrat' },
  { code: 'MA', name: 'Morocco', dialCode: '212', timezone: 'Africa/Casablanca' },
  { code: 'MZ', name: 'Mozambique', dialCode: '258', timezone: 'Africa/Maputo' },
  { code: 'MM', name: 'Myanmar', dialCode: '95', timezone: 'Asia/Yangon' },
  { code: 'NA', name: 'Namibia', dialCode: '264', timezone: 'Africa/Windhoek' },
  { code: 'NR', name: 'Nauru', dialCode: '674', timezone: 'Pacific/Nauru' },
  { code: 'NP', name: 'Nepal', dialCode: '977', timezone: 'Asia/Kathmandu' },
  { code: 'NL', name: 'Netherlands', dialCode: '31', timezone: 'Europe/Amsterdam' },
  { code: 'NC', name: 'New Caledonia', dialCode: '687', timezone: 'Pacific/Noumea' },
  { code: 'NZ', name: 'New Zealand', dialCode: '64', timezone: 'Pacific/Auckland' },
  { code: 'NI', name: 'Nicaragua', dialCode: '505', timezone: 'America/Managua' },
  { code: 'NE', name: 'Niger', dialCode: '227', timezone: 'Africa/Niamey' },
  { code: 'NG', name: 'Nigeria', dialCode: '234', timezone: 'Africa/Lagos' },
  { code: 'NU', name: 'Niue', dialCode: '683', timezone: 'Pacific/Niue' },
  { code: 'NF', name: 'Norfolk Island', dialCode: '672', timezone: 'Pacific/Norfolk' },
  { code: 'MK', name: 'North Macedonia', dialCode: '389', timezone: 'Europe/Skopje' },
  { code: 'MP', name: 'Northern Mariana Islands', dialCode: '1670', timezone: 'Pacific/Saipan' },
  { code: 'NO', name: 'Norway', dialCode: '47', timezone: 'Europe/Oslo' },
  { code: 'OM', name: 'Oman', dialCode: '968', timezone: 'Asia/Muscat' },
  { code: 'PK', name: 'Pakistan', dialCode: '92', timezone: 'Asia/Karachi' },
  { code: 'PW', name: 'Palau', dialCode: '680', timezone: 'Pacific/Palau' },
  { code: 'PS', name: 'Palestine', dialCode: '970', timezone: 'Asia/Hebron' },
  { code: 'PA', name: 'Panama', dialCode: '507', timezone: 'America/Panama' },
  { code: 'PG', name: 'Papua New Guinea', dialCode: '675', timezone: 'Pacific/Port_Moresby' },
  { code: 'PY', name: 'Paraguay', dialCode: '595', timezone: 'America/Asuncion' },
  { code: 'PE', name: 'Peru', dialCode: '51', timezone: 'America/Lima' },
  { code: 'PH', name: 'Philippines', dialCode: '63', timezone: 'Asia/Manila' },
  { code: 'PN', name: 'Pitcairn', dialCode: '64', timezone: 'Pacific/Pitcairn' },
  { code: 'PL', name: 'Poland', dialCode: '48', timezone: 'Europe/Warsaw' },
  { code: 'PT', name: 'Portugal', dialCode: '351', timezone: 'Europe/Lisbon' },
  { code: 'PR', name: 'Puerto Rico', dialCode: '1787', timezone: 'America/Puerto_Rico' },
  { code: 'QA', name: 'Qatar', dialCode: '974', timezone: 'Asia/Qatar' },
  { code: 'RO', name: 'Romania', dialCode: '40', timezone: 'Europe/Bucharest' },
  { code: 'RU', name: 'Russia', dialCode: '7', timezone: 'Europe/Moscow' },
  { code: 'RW', name: 'Rwanda', dialCode: '250', timezone: 'Africa/Kigali' },
  { code: 'RE', name: 'Réunion', dialCode: '262', timezone: 'Indian/Reunion' },
  { code: 'BL', name: 'Saint Barthélemy', dialCode: '590', timezone: 'America/St_Barthelemy' },
  { code: 'SH', name: 'Saint Helena, Ascension and Tristan da Cunha', dialCode: '290', timezone: 'Atlantic/St_Helena' },
  { code: 'KN', name: 'Saint Kitts and Nevis', dialCode: '1869', timezone: 'America/St_Kitts' },
  { code: 'LC', name: 'Saint Lucia', dialCode: '1758', timezone: 'America/St_Lucia' },
  { code: 'MF', name: 'Saint Martin (French part)', dialCode: '590', timezone: 'America/Marigot' },
  { code: 'PM', name: 'Saint Pierre and Miquelon', dialCode: '508', timezone: 'America/Miquelon' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', dialCode: '1784', timezone: 'America/St_Vincent' },
  { code: 'WS', name: 'Samoa', dialCode: '685', timezone: 'Pacific/Apia' },
  { code: 'SM', name: 'San Marino', dialCode: '378', timezone: 'Europe/San_Marino' },
  { code: 'ST', name: 'Sao Tome and Principe', dialCode: '239', timezone: 'Africa/Sao_Tome' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '966', timezone: 'Asia/Riyadh' },
  { code: 'SN', name: 'Senegal', dialCode: '221', timezone: 'Africa/Dakar' },
  { code: 'RS', name: 'Serbia', dialCode: '381', timezone: 'Europe/Belgrade' },
  { code: 'SC', name: 'Seychelles', dialCode: '248', timezone: 'Indian/Mahe' },
  { code: 'SL', name: 'Sierra Leone', dialCode: '232', timezone: 'Africa/Freetown' },
  { code: 'SG', name: 'Singapore', dialCode: '65', timezone: 'Asia/Singapore' },
  { code: 'SX', name: 'Sint Maarten (Dutch part)', dialCode: '1721', timezone: 'America/Lower_Princes' },
  { code: 'SK', name: 'Slovakia', dialCode: '421', timezone: 'Europe/Bratislava' },
  { code: 'SI', name: 'Slovenia', dialCode: '386', timezone: 'Europe/Ljubljana' },
  { code: 'SB', name: 'Solomon Islands', dialCode: '677', timezone: 'Pacific/Guadalcanal' },
  { code: 'SO', name: 'Somalia', dialCode: '252', timezone: 'Africa/Mogadishu' },
  { code: 'ZA', name: 'South Africa', dialCode: '27', timezone: 'Africa/Johannesburg' },
  { code: 'GS', name: 'South Georgia and the South Sandwich Islands', dialCode: '500', timezone: 'Atlantic/South_Georgia' },
  { code: 'KR', name: 'South Korea', dialCode: '82', timezone: 'Asia/Seoul' },
  { code: 'SS', name: 'South Sudan', dialCode: '211', timezone: 'Africa/Juba' },
  { code: 'ES', name: 'Spain', dialCode: '34', timezone: 'Europe/Madrid' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '94', timezone: 'Asia/Colombo' },
  { code: 'SD', name: 'Sudan', dialCode: '249', timezone: 'Africa/Khartoum' },
  { code: 'SR', name: 'Suriname', dialCode: '597', timezone: 'America/Paramaribo' },
  { code: 'SJ', name: 'Svalbard and Jan Mayen', dialCode: '47', timezone: 'Arctic/Longyearbyen' },
  { code: 'SE', name: 'Sweden', dialCode: '46', timezone: 'Europe/Stockholm' },
  { code: 'CH', name: 'Switzerland', dialCode: '41', timezone: 'Europe/Zurich' },
  { code: 'SY', name: 'Syria', dialCode: '963', timezone: 'Asia/Damascus' },
  { code: 'TW', name: 'Taiwan', dialCode: '886', timezone: 'Asia/Taipei' },
  { code: 'TJ', name: 'Tajikistan', dialCode: '992', timezone: 'Asia/Dushanbe' },
  { code: 'TZ', name: 'Tanzania', dialCode: '255', timezone: 'Africa/Dar_es_Salaam' },
  { code: 'TH', name: 'Thailand', dialCode: '66', timezone: 'Asia/Bangkok' },
  { code: 'TL', name: 'Timor-Leste', dialCode: '670', timezone: 'Asia/Dili' },
  { code: 'TG', name: 'Togo', dialCode: '228', timezone: 'Africa/Lome' },
  { code: 'TK', name: 'Tokelau', dialCode: '690', timezone: 'Pacific/Fakaofo' },
  { code: 'TO', name: 'Tonga', dialCode: '676', timezone: 'Pacific/Tongatapu' },
  { code: 'TT', name: 'Trinidad and Tobago', dialCode: '1868', timezone: 'America/Port_of_Spain' },
  { code: 'TN', name: 'Tunisia', dialCode: '216', timezone: 'Africa/Tunis' },
  { code: 'TM', name: 'Turkmenistan', dialCode: '993', timezone: 'Asia/Ashgabat' },
  { code: 'TC', name: 'Turks and Caicos Islands', dialCode: '1649', timezone: 'America/Grand_Turk' },
  { code: 'TV', name: 'Tuvalu', dialCode: '688', timezone: 'Pacific/Funafuti' },
  { code: 'TR', name: 'Türkiye', dialCode: '90', timezone: 'Europe/Istanbul' },
  { code: 'UG', name: 'Uganda', dialCode: '256', timezone: 'Africa/Kampala' },
  { code: 'UA', name: 'Ukraine', dialCode: '380', timezone: 'Europe/Kyiv' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '971', timezone: 'Asia/Dubai' },
  { code: 'GB', name: 'United Kingdom', dialCode: '44', timezone: 'Europe/London' },
  { code: 'US', name: 'United States', dialCode: '1', timezone: 'America/New_York' },
  { code: 'UM', name: 'United States Minor Outlying Islands', dialCode: '1', timezone: 'Pacific/Wake' },
  { code: 'UY', name: 'Uruguay', dialCode: '598', timezone: 'America/Montevideo' },
  { code: 'UZ', name: 'Uzbekistan', dialCode: '998', timezone: 'Asia/Tashkent' },
  { code: 'VU', name: 'Vanuatu', dialCode: '678', timezone: 'Pacific/Efate' },
  { code: 'VE', name: 'Venezuela', dialCode: '58', timezone: 'America/Caracas' },
  { code: 'VN', name: 'Vietnam', dialCode: '84', timezone: 'Asia/Ho_Chi_Minh' },
  { code: 'VG', name: 'Virgin Islands (British)', dialCode: '1284', timezone: 'America/Tortola' },
  { code: 'VI', name: 'Virgin Islands (U.S.)', dialCode: '1340', timezone: 'America/St_Thomas' },
  { code: 'WF', name: 'Wallis and Futuna', dialCode: '681', timezone: 'Pacific/Wallis' },
  { code: 'EH', name: 'Western Sahara', dialCode: '212', timezone: 'Africa/El_Aaiun' },
  { code: 'YE', name: 'Yemen', dialCode: '967', timezone: 'Asia/Aden' },
  { code: 'ZM', name: 'Zambia', dialCode: '260', timezone: 'Africa/Lusaka' },
  { code: 'ZW', name: 'Zimbabwe', dialCode: '263', timezone: 'Africa/Harare' },
  { code: 'AX', name: 'Åland Islands', dialCode: '358', timezone: 'Europe/Mariehamn' },
]


const BY_CODE: ReadonlyMap<string, Country> = new Map(
  COUNTRIES.map((c) => [c.code, c])
)

const BY_NAME: ReadonlyMap<string, Country> = new Map(
  COUNTRIES.map((c) => [c.name.toLowerCase(), c])
)

/**
 * Free-text values written before country codes existed, plus the common
 * shorthands people type. Used by normalizeCountry so the old rows in
 * users.country resolve instead of being dropped on the floor.
 */
const LEGACY_ALIASES: Readonly<Record<string, string>> = {
  usa: 'US',
  'u.s.a.': 'US',
  'u.s.': 'US',
  us: 'US',
  america: 'US',
  'united states of america': 'US',
  uk: 'GB',
  'u.k.': 'GB',
  britain: 'GB',
  'great britain': 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'northern ireland': 'GB',
  uae: 'AE',
  'u.a.e.': 'AE',
  emirates: 'AE',
  'czech republic': 'CZ',
  czechia: 'CZ',
  'south korea': 'KR',
  'republic of korea': 'KR',
  'korea, republic of': 'KR',
  'north korea': 'KP',
  russia: 'RU',
  'russian federation': 'RU',
  turkey: 'TR',
  turkiye: 'TR',
  vietnam: 'VN',
  'viet nam': 'VN',
  iran: 'IR',
  syria: 'SY',
  laos: 'LA',
  macedonia: 'MK',
  swaziland: 'SZ',
  'cape verde': 'CV',
  'ivory coast': 'CI',
  "cote d'ivoire": 'CI',
  burma: 'MM',
  holland: 'NL',
  'the netherlands': 'NL',
  bolivia: 'BO',
  venezuela: 'VE',
  tanzania: 'TZ',
  moldova: 'MD',
  brunei: 'BN',
  micronesia: 'FM',
  palestine: 'PS',
  vatican: 'VA',
  'vatican city': 'VA',
  'hong kong sar': 'HK',
  'east timor': 'TL',
  'democratic republic of the congo': 'CD',
  drc: 'CD',
  'republic of the congo': 'CG',
}

/** Look up a country by its ISO alpha-2 code. */
export function getCountryByCode(code: string | null | undefined): Country | null {
  if (!code) return null
  return BY_CODE.get(code.trim().toUpperCase()) ?? null
}

/**
 * Resolve any stored or typed country value to an ISO alpha-2 code.
 * Accepts a code, an exact English name, or one of the legacy aliases above.
 * Returns null when nothing matches, so callers can report rather than guess.
 */
export function normalizeCountry(value: string | null | undefined): string | null {
  if (!value) return null

  const raw = value.trim()
  if (!raw) return null

  const upper = raw.toUpperCase()
  if (BY_CODE.has(upper)) return upper

  const lower = raw.toLowerCase()
  const exact = BY_NAME.get(lower)
  if (exact) return exact.code

  return LEGACY_ALIASES[lower] ?? null
}

/**
 * Display name for a country, localised when the runtime supports it.
 * Falls back to the English name, so this is safe on every platform.
 */
export function getCountryName(code: string, locale: string = 'en'): string {
  const country = getCountryByCode(code)
  if (!country) return code

  try {
    const display = new Intl.DisplayNames([locale], { type: 'region' })
    return display.of(country.code) ?? country.name
  } catch {
    return country.name
  }
}

/**
 * Search countries by name or code.
 * Prefix matches rank above substring matches so typing "in" surfaces India
 * before Argentina.
 */
export function filterCountries(searchTerm: string, locale: string = 'en'): Country[] {
  const term = searchTerm.trim().toLowerCase()
  if (!term) return [...COUNTRIES]

  const prefix: Country[] = []
  const contains: Country[] = []

  for (const country of COUNTRIES) {
    const localised = getCountryName(country.code, locale).toLowerCase()
    const name = country.name.toLowerCase()
    const code = country.code.toLowerCase()

    if (name.startsWith(term) || localised.startsWith(term) || code === term) {
      prefix.push(country)
    } else if (name.includes(term) || localised.includes(term)) {
      contains.push(country)
    }
  }

  return [...prefix, ...contains]
}

/** Representative IANA timezone for a country, for pre-filling birth details. */
export function getCountryTimezone(code: string): string | null {
  return getCountryByCode(code)?.timezone ?? null
}
