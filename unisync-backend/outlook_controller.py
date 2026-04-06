import requests

async def send_email(to_email: str, subject: str, body: str):
    token = "EwBYBMl6BAAU9BatlgMxts2T1B5e3Mucgfs4jcAAAaLil2YVQajCoGUnxRErxcK2DC43VCUh7PqvVw8DHbQPcoeG0yisubs5YzW0E4tGhxLc1UCN68GPVHl4d1UrmunOvOVLg/uqd464cFkGflQ6+8ruUGp+A/oYda++tWPtJsrkItNSPzAN/9j6kHGLnnCxJoZSqWIQgcmmG+8tEkNAUyDMoYDgV9n3GKCO76O7KtwMJ5z+EO6nluaCCNzwqYJwqrFCIHhnrT/TcjamIzPMpsoAiZJDe8cOAO43kKf6iUWmdSvDqsljgmtsAum9OS2xgL5gnVwa47WW/Y0iAL8qosEc1883WLnYIe/jJpvWPU655qus5+bBrAYYLDZEe5IQZgAAEDWmbAnfE2knsjtqqrE/GjIgA20OnsDV3HdYyzFBE6R2K/+jKvASNj4ybU/FXu456RMc5wSItahN+9D3Em5guNsDx497q1B/lZ0WUEdZWhikpYgVrbMmM3TsuklJlGI4qZrLTeIsgPW9TLeYsEM6XUYr3cmjYZw7WH3J5uZAEljljpaBjZktFFPMSGRVlkumNbudHzeOkQ3/bF/V4RUWKl5EZTPlWb5XBwG0XQXC2MH/au/ZP0g2xl17Z+gUy3TXS7mRId2qdVdOnVXNFDLq7yCvSh/6TuJEij1s/wkblf9oNE9gH/slg6oxnNklJcPeivdkwx5l3ZVe2GZsNfWYTx7hWMNDIISmkTHXp+hP2xBl65dEmFJJIUpg82QMaECxU4IJjkKB7AQjzrHf72YhodBieI8iUst6UwbxeL6A3+CeJCdJ8oYHpp/NK1BI5LbEg6iS8Ae30oc01pjp0DVvhvAc8S+5e4ocbbVLyjM8RFGacuOOZ90Gg3saNBNTc3lzl7gt4uy9UShhLjCKA09ZQ/vkhS6HAcRym+0q0NWmF2R5yi+FrE3co1C1JsUoMtKr3CCTDdbmtTv32c3VYxQ8qr2+k/tVVIZiAs/F2qEra2fiCWoUi62do653TfzjeJhaPWY1zpOq4sjIMbAGgaevM67euv4dbhZpXUAzelKs10Frp+R6/drOacuH8vYYHiPgDsQNvReLPa7WyWOPPH3argP2JzZYd4NrWcucC2UTzsuTP+yNeST5DeuBl54gTpuKPVqAYMN1/zzFBADZNIDrYKRz8PnIN8aKhzhZc2dUBO9XCP092ERZpoXK4AZphXcziPIrZt5Xo/QCTPAfLeSb/1zQv+Q4634zQ8CWfzmxaBTymg9zTVGmR3+Tg0chmldrNKxW/joOFtbSsBCxMwnRWiUDfwefVTXXgQZbYWD6Uh/gBEisVOUTDkWcoILukYxFbcnNhy53Fwc10TRQGXI9NkQG9oG4vSnnRQidSjS44Uz6ELUIr9tqo1DVcPEhLub04jY2VFzgnqvql3KDQ89FyG4RnLNhRjMV62BUPYdclF2uP9WqvqdrdAUwOAlErLk9q7X+bgM="

    url = "https://graph.microsoft.com/v1.0/me/sendMail"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
    "message": {
        "subject": subject,
        "body": {
            "contentType": "Text",
            "content": body
        },
        "toRecipients": [
            {
                "emailAddress": {
                    "address": to_email
                }
            }
        ]
    }
}

    response = await requests.post(url, headers=headers, json=payload)

    print(response.text, response.status_code)
    return {
        "status": response.status_code,
        "response": response.text
    }


send_email("thakkatq@mail.uc.edu", "test", "Hi tanishq! t")