export const formatDate = (dateString, format = 'DD-MM-YYYY') => {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return format
    .replace('DD', day.toString().padStart(2, '0'))
    .replace('MM', month.toString().padStart(2, '0'))
    .replace('YYYY', year.toString())
}
