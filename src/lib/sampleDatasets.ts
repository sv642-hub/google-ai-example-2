import * as XLSX from 'xlsx';

export function generateSampleDataset(type: 'housing' | 'sales' | 'customer' = 'housing'): {
  workbook: XLSX.WorkBook;
  fileName: string;
} {
  const wb = XLSX.utils.book_new();

  if (type === 'customer') {
    // Customer Mall Segmentation: Age, Annual_Income_k, Spending_Score, Purchases_Per_Year
    const rows = [
      { CustomerID: 101, Age: 19, Annual_Income_k: 15, Spending_Score: 39, Purchases: 6 },
      { CustomerID: 102, Age: 21, Annual_Income_k: 15, Spending_Score: 81, Purchases: 15 },
      { CustomerID: 103, Age: 20, Annual_Income_k: 16, Spending_Score: 6, Purchases: 2 },
      { CustomerID: 104, Age: 23, Annual_Income_k: 16, Spending_Score: 77, Purchases: 14 },
      { CustomerID: 105, Age: 31, Annual_Income_k: 17, Spending_Score: 40, Purchases: 7 },
      { CustomerID: 106, Age: 22, Annual_Income_k: 17, Spending_Score: 76, Purchases: 12 },
      { CustomerID: 107, Age: 35, Annual_Income_k: 18, Spending_Score: 6, Purchases: 3 },
      { CustomerID: 108, Age: 23, Annual_Income_k: 18, Spending_Score: 94, Purchases: 18 },
      { CustomerID: 109, Age: 64, Annual_Income_k: 19, Spending_Score: 3, Purchases: 1 },
      { CustomerID: 110, Age: 30, Annual_Income_k: 19, Spending_Score: 72, Purchases: 13 },
      { CustomerID: 111, Age: 67, Annual_Income_k: 19, Spending_Score: 14, Purchases: 4 },
      { CustomerID: 112, Age: 35, Annual_Income_k: 19, Spending_Score: 99, Purchases: 20 },
      { CustomerID: 113, Age: 58, Annual_Income_k: 20, Spending_Score: 15, Purchases: 3 },
      { CustomerID: 114, Age: 24, Annual_Income_k: 20, Spending_Score: 77, Purchases: 14 },
      { CustomerID: 115, Age: 37, Annual_Income_k: 20, Spending_Score: 13, Purchases: 2 },
      { CustomerID: 116, Age: 22, Annual_Income_k: 20, Spending_Score: 79, Purchases: 16 },
      { CustomerID: 117, Age: 35, Annual_Income_k: 21, Spending_Score: 35, Purchases: 6 },
      { CustomerID: 118, Age: 20, Annual_Income_k: 21, Spending_Score: 66, Purchases: 11 },
      { CustomerID: 119, Age: 52, Annual_Income_k: 23, Spending_Score: 29, Purchases: 5 },
      { CustomerID: 120, Age: 35, Annual_Income_k: 24, Spending_Score: 98, Purchases: 19 },
      { CustomerID: 121, Age: 48, Annual_Income_k: 39, Spending_Score: 42, Purchases: 8 },
      { CustomerID: 122, Age: 42, Annual_Income_k: 44, Spending_Score: 48, Purchases: 9 },
      { CustomerID: 123, Age: 38, Annual_Income_k: 54, Spending_Score: 55, Purchases: 10 },
      { CustomerID: 124, Age: 40, Annual_Income_k: 60, Spending_Score: 40, Purchases: 7 },
      { CustomerID: 125, Age: 27, Annual_Income_k: 67, Spending_Score: 89, Purchases: 17 },
      { CustomerID: 126, Age: 45, Annual_Income_k: 78, Spending_Score: 17, Purchases: 4 },
      { CustomerID: 127, Age: 32, Annual_Income_k: 86, Spending_Score: 95, Purchases: 22 },
      { CustomerID: 128, Age: 59, Annual_Income_k: 93, Spending_Score: 14, Purchases: 3 },
      { CustomerID: 129, Age: 28, Annual_Income_k: 101, Spending_Score: 91, Purchases: 18 },
      { CustomerID: 130, Age: 47, Annual_Income_k: 107, Spending_Score: 16, Purchases: 4 },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    return { workbook: wb, fileName: 'customer_segments_sample.xlsx' };
  }

  if (type === 'housing') {
    // House Prices based on SquareFeet, Bedrooms, Bathrooms, DistanceToCity
    const rows = [
      { SquareFeet: 1200, Bedrooms: 2, Bathrooms: 1, DistanceToCity: 14, Price: 220000 },
      { SquareFeet: 1450, Bedrooms: 3, Bathrooms: 2, DistanceToCity: 12, Price: 265000 },
      { SquareFeet: 1600, Bedrooms: 3, Bathrooms: 2, DistanceToCity: 10, Price: 310000 },
      { SquareFeet: 1850, Bedrooms: 3, Bathrooms: 2.5, DistanceToCity: 8, Price: 355000 },
      { SquareFeet: 2100, Bedrooms: 4, Bathrooms: 3, DistanceToCity: 7, Price: 410000 },
      { SquareFeet: 2350, Bedrooms: 4, Bathrooms: 3, DistanceToCity: 5, Price: 470000 },
      { SquareFeet: 2500, Bedrooms: 4, Bathrooms: 3.5, DistanceToCity: 6, Price: 495000 },
      { SquareFeet: 2800, Bedrooms: 5, Bathrooms: 4, DistanceToCity: 4, Price: 560000 },
      { SquareFeet: 980, Bedrooms: 1, Bathrooms: 1, DistanceToCity: 18, Price: 175000 },
      { SquareFeet: 1100, Bedrooms: 2, Bathrooms: 1, DistanceToCity: 15, Price: 205000 },
      { SquareFeet: 1350, Bedrooms: 2, Bathrooms: 1.5, DistanceToCity: 11, Price: 250000 },
      { SquareFeet: 1700, Bedrooms: 3, Bathrooms: 2, DistanceToCity: 9, Price: 330000 },
      { SquareFeet: 1950, Bedrooms: 3, Bathrooms: 2, DistanceToCity: 7.5, Price: 380000 },
      { SquareFeet: 2200, Bedrooms: 4, Bathrooms: 2.5, DistanceToCity: 6, Price: 430000 },
      { SquareFeet: 2600, Bedrooms: 4, Bathrooms: 3, DistanceToCity: 4.5, Price: 515000 },
      { SquareFeet: 3100, Bedrooms: 5, Bathrooms: 4, DistanceToCity: 3, Price: 630000 },
      { SquareFeet: 1500, Bedrooms: 3, Bathrooms: 2, DistanceToCity: 13, Price: 275000 },
      { SquareFeet: 1780, Bedrooms: 3, Bathrooms: 2, DistanceToCity: 8.5, Price: 345000 },
      { SquareFeet: 2050, Bedrooms: 3, Bathrooms: 2.5, DistanceToCity: 7, Price: 400000 },
      { SquareFeet: 2400, Bedrooms: 4, Bathrooms: 3, DistanceToCity: 5, Price: 480000 },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Housing_Data');
    return { workbook: wb, fileName: 'housing_prices_sample.xlsx' };
  }

  // Sales advertising sample: TV, Radio, SocialMedia -> Sales revenue
  const rows = [
    { TV_Ad_Spend: 230.1, Radio_Ad_Spend: 37.8, Social_Ad_Spend: 69.2, Revenue: 22.1 },
    { TV_Ad_Spend: 44.5, Radio_Ad_Spend: 39.3, Social_Ad_Spend: 45.1, Revenue: 10.4 },
    { TV_Ad_Spend: 17.2, Radio_Ad_Spend: 45.9, Social_Ad_Spend: 69.3, Revenue: 9.3 },
    { TV_Ad_Spend: 151.5, Radio_Ad_Spend: 41.3, Social_Ad_Spend: 58.5, Revenue: 18.5 },
    { TV_Ad_Spend: 180.8, Radio_Ad_Spend: 10.8, Social_Ad_Spend: 58.4, Revenue: 12.9 },
    { TV_Ad_Spend: 8.7, Radio_Ad_Spend: 48.9, Social_Ad_Spend: 75.0, Revenue: 7.2 },
    { TV_Ad_Spend: 57.5, Radio_Ad_Spend: 32.8, Social_Ad_Spend: 23.5, Revenue: 11.8 },
    { TV_Ad_Spend: 120.2, Radio_Ad_Spend: 19.6, Social_Ad_Spend: 11.6, Revenue: 13.2 },
    { TV_Ad_Spend: 8.6, Radio_Ad_Spend: 2.1, Social_Ad_Spend: 1.0, Revenue: 4.8 },
    { TV_Ad_Spend: 199.8, Radio_Ad_Spend: 2.6, Social_Ad_Spend: 21.2, Revenue: 10.6 },
    { TV_Ad_Spend: 66.1, Radio_Ad_Spend: 5.8, Social_Ad_Spend: 24.2, Revenue: 8.6 },
    { TV_Ad_Spend: 214.7, Radio_Ad_Spend: 24.0, Social_Ad_Spend: 4.0, Revenue: 17.4 },
    { TV_Ad_Spend: 23.8, Radio_Ad_Spend: 35.1, Social_Ad_Spend: 65.9, Revenue: 9.2 },
    { TV_Ad_Spend: 97.5, Radio_Ad_Spend: 7.6, Social_Ad_Spend: 7.2, Revenue: 9.7 },
    { TV_Ad_Spend: 204.1, Radio_Ad_Spend: 32.9, Social_Ad_Spend: 46.0, Revenue: 19.0 },
    { TV_Ad_Spend: 195.4, Radio_Ad_Spend: 47.7, Social_Ad_Spend: 52.9, Revenue: 22.4 },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sales_Marketing');
  return { workbook: wb, fileName: 'ad_spend_sales_sample.xlsx' };
}
